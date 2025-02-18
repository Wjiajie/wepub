import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { supabase } from '@/lib/supabase';

interface Article {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
}

interface BaseResult {
  url: string;
}

interface SuccessResult extends BaseResult {
  success: true;
  article: Article;
}

interface SuccessResultWithDom extends SuccessResult {
  dom: JSDOM;
}

interface ErrorResult extends BaseResult {
  success: false;
  error: string;
  errorDetail?: string;
}

type ParseResult = SuccessResultWithDom | ErrorResult;
type CleanResult = SuccessResult | ErrorResult;

// 辅助函数：检查URL是否是根URL的子链接
function isSubUrl(rootUrl: string, testUrl: string): boolean {
  try {
    const root = new URL(rootUrl);
    const test = new URL(testUrl);
    
    // 检查域名是否相同
    if (test.hostname !== root.hostname) {
      return false;
    }
    
    // 获取根URL的基础路径
    // 例如：https://www.jiajiewu.top/blog -> /blog
    const rootBasePath = root.pathname.split('/')[1];
    
    // 如果根URL没有基础路径，则所有同域名的链接都是有效的
    if (!rootBasePath) {
      return true;
    }
    
    // 检查测试URL是否以根URL的基础路径开始
    return test.pathname.startsWith(`/${rootBasePath}`);
  } catch {
    return false;
  }
}

// 辅助函数：提取所有链接
function extractLinks(dom: JSDOM, rootUrl: string): string[] {
  const links = new Set<string>();
  const document = dom.window.document;
  
  try {
    // 获取所有可能包含链接的元素
    const linkElements = document.querySelectorAll('a[href], link[href], area[href]');
    
    linkElements.forEach(element => {
      try {
        const href = element.getAttribute('href');
        if (!href) return;
        
        // 跳过锚点链接
        if (href.startsWith('#')) return;
        
        // 跳过 javascript: 链接
        if (href.startsWith('javascript:')) return;
        
        // 跳过邮件链接
        if (href.startsWith('mailto:')) return;
        
        // 跳过电话链接
        if (href.startsWith('tel:')) return;
        
        // 构建完整URL
        const url = new URL(href, rootUrl);
        
        // 规范化URL
        // 1. 移除URL中的hash部分
        url.hash = '';
        // 2. 移除URL中的search部分
        url.search = '';
        // 3. 确保路径以/结尾
        if (!url.pathname.endsWith('/')) {
          url.pathname += '/';
        }
        
        // 只保留属于根URL的子链接
        if (isSubUrl(rootUrl, url.href)) {
          links.add(url.href);
        }
      } catch (error) {
        // 忽略无效的URL
        console.error('Invalid URL:', error);
      }
    });
  } catch (error) {
    console.error('Error extracting links:', error);
  }
  
  return Array.from(links);
}

// 辅助函数：解析单个页面
async function parsePage(url: string): Promise<ParseResult> {
  try {
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    clearTimeout(timeoutId);

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP 请求失败: ${response.status} ${response.statusText}\n可能原因：\n1. 网站可能已下线\n2. 网站可能禁止了爬虫访问\n3. 网站可能要求身份验证`);
    }

    // 检查内容类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      throw new Error(`不支持的内容类型: ${contentType || '未知'}\n目标URL不是一个HTML页面，可能是：\n1. PDF文件\n2. 图片\n3. 其他二进制文件`);
    }

    const html = await response.text();
    
    // 检查HTML内容是否为空
    if (!html || html.trim().length === 0) {
      throw new Error('页面内容为空\n可能原因：\n1. 网站返回了空白页面\n2. 网站可能需要JavaScript才能显示内容\n3. 网站可能有反爬虫机制');
    }

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      return {
        url,
        success: false,
        error: '无法解析文章内容\n可能原因：\n1. 页面结构不符合文章格式\n2. 页面内容可能需要登录才能访问\n3. 页面可能是一个列表或首页',
      };
    }

    // 检查解析后的内容是否为空
    if (!article.content || article.content.trim().length === 0) {
      throw new Error('解析后的内容为空\n可能原因：\n1. 文章内容可能是动态加载的\n2. 文章可能需要订阅或登录\n3. 网站可能使用了特殊的内容保护机制');
    }

    return {
      url,
      success: true,
      article,
      dom,
    };
  } catch (error) {
    console.error(`解析页面失败 ${url}:`, error);
    let errorMessage = '解析失败';
    let errorDetail = '';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = '请求超时';
        errorDetail = '可能原因：\n1. 网络连接不稳定\n2. 服务器响应时间过长\n3. 网站可能已无法访问';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '连接被拒绝';
        errorDetail = '可能原因：\n1. 网站可能已下线\n2. 防火墙可能阻止了访问\n3. 网站可能限制了访问来源';
      } else if (error.message.includes('CORS')) {
        errorMessage = '跨域请求被拒绝';
        errorDetail = '可能原因：\n1. 网站禁止了跨域访问\n2. 需要特殊的访问权限\n3. 网站可能有安全限制';
      } else {
        errorMessage = error.message;
        errorDetail = '如果问题持续存在，请尝试：\n1. 检查网址是否正确\n2. 稍后重试\n3. 尝试其他网页';
      }
    }
    
    return {
      url,
      success: false,
      error: errorMessage,
      errorDetail: errorDetail
    };
  }
}

// 并发控制函数
async function asyncPool<T, U>(
  poolLimit: number,
  items: T[],
  iteratorFn: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = Promise.resolve().then(async () => {
      const result = await iteratorFn(item);
      results.push(result);
    });
    
    executing.add(promise);
    const clean = () => executing.delete(promise);
    promise.then(clean).catch(clean);

    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}

// 重试函数
async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

// 递归爬取函数
async function crawlRecursively(
  rootUrl: string,
  maxDepth: number,
  maxPages: number,
  processedUrls = new Set<string>(),
  currentDepth = 0
): Promise<CleanResult[]> {
  // 如果达到最大深度或已处理页面数量达到上限，则停止
  if (currentDepth >= maxDepth || processedUrls.size >= maxPages) {
    return [];
  }
  
  // 如果该URL已经处理过，则跳过
  if (processedUrls.has(rootUrl)) {
    return [];
  }
  
  // 标记该URL为已处理
  processedUrls.add(rootUrl);
  
  // 解析当前页面（带重试机制）
  const result = await retry(() => parsePage(rootUrl));
  let results: CleanResult[] = [];
  
  if (result.success) {
    const { dom, ...cleanResult } = result;
    results = [cleanResult];
    
    // 如果还可以继续爬取
    if (processedUrls.size < maxPages) {
      // 提取当前页面中的所有链接
      const links = extractLinks(dom, rootUrl);
      
      // 使用并发池处理子链接
      const childResults = await asyncPool(
        3, // 最大并发数
        links,
        async (link) => crawlRecursively(link, maxDepth, maxPages, processedUrls, currentDepth + 1)
      );
      
      // 合并所有结果
      results.push(...childResults.flat());
    }
  } else {
    results = [result];
  }
  
  return results;
}

export async function POST(req: Request) {
  try {
    const { url, maxPages = 10, maxDepth = 3 } = await req.json();
    
    // 验证URL格式
    try {
      new URL(url);
    } catch (_) {  // eslint-disable-line @typescript-eslint/no-unused-vars
      return NextResponse.json(
        { 
          error: 'URL格式无效',
          errorDetail: '请确保：\n1. URL包含http://或https://\n2. URL格式正确\n3. 域名有效'
        },
        { status: 400 }
      );
    }
    
    // 开始递归爬取
    const processedUrls = new Set<string>();
    const results = await crawlRecursively(url, maxDepth, maxPages, processedUrls);
    
    // 过滤出成功解析的页面
    const successfulResults = results.filter((result): result is SuccessResult => result.success);
    
    // 如果没有成功解析任何页面
    if (successfulResults.length === 0) {
      const errors = results
        .filter(result => !result.success)
        .map(result => ({
          url: result.url,
          error: (result as ErrorResult).error,
          errorDetail: (result as ErrorResult & { errorDetail?: string }).errorDetail
        }));

      return NextResponse.json({
        error: '未能成功解析任何页面',
        errorDetail: '详细错误信息：\n' + 
          errors.map(e => `${e.url}:\n${e.error}\n${e.errorDetail || ''}`).join('\n\n'),
        errors: errors
      }, { status: 400 });
    }

    // 如果配置了Supabase，保存到数据库
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { error } = await supabase
          .from('articles')
          .insert(
            successfulResults.map(result => ({
              url: result.url,
              title: result.article.title,
              content: result.article.content,
              excerpt: result.article.excerpt,
              author: result.article.byline,
            }))
          );

        if (error) {
          console.error('保存文章失败:', error);
        }
      } catch (dbError) {
        console.error('数据库操作失败:', dbError);
      }
    }

    return NextResponse.json({
      results: successfulResults,
      totalProcessed: results.length,
      successCount: successfulResults.length,
    });
  } catch (error) {
    console.error('爬取失败:', error);
    return NextResponse.json(
      { 
        error: '爬取失败',
        errorDetail: error instanceof Error ? 
          `错误详情：${error.message}\n\n如果问题持续存在，请：\n1. 检查网络连接\n2. 确认网站可以正常访问\n3. 稍后重试` : 
          '发生未知错误，请稍后重试'
      },
      { status: 500 }
    );
  }
} 