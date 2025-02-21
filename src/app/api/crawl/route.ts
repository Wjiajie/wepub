import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

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

// 辅助函数：判断是否为相对链接
function isRelativeUrl(url: string): boolean {
  // 如果是以 / 开头，或者不包含 :// 的链接，就认为是相对链接
  return url.startsWith('/') || !url.includes('://');
}

// 辅助函数：获取URL的根域名
function getRootDomain(url: string): string {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}/`;
}

// 辅助函数：检查URL是否是根URL的子链接
function isSubUrl(rootUrl: string, testUrl: string): boolean {
  try {
    const root = new URL(rootUrl);
    const test = new URL(testUrl);
    
    // 首先检查域名是否相同
    if (test.hostname !== root.hostname) {
      return false;
    }

    // 规范化URL（移除末尾的斜杠）
    const normalizedRootUrl = rootUrl.replace(/\/$/, '');
    const normalizedTestUrl = testUrl.replace(/\/$/, '');
    
    // 如果测试URL等于根URL，这不是子链接（是同一个页面）
    if (normalizedTestUrl === normalizedRootUrl) {
      return false;
    }
    
    // 判断测试URL是否包含根URL
    return normalizedTestUrl.startsWith(normalizedRootUrl);
  } catch {
    return false;
  }
}

// 辅助函数：提取所有链接
function extractLinks(dom: JSDOM, rootUrl: string, shouldPrintDetails: boolean = false): string[] {
  const links = new Set<string>();
  const document = dom.window.document;
  const rootDomain = getRootDomain(rootUrl);
  
  try {
    // 只在需要时打印完整的 HTML 内容
    if (shouldPrintDetails) {
      console.log('\n=== Readability 处理后的页面内容 ===\n');
      console.log(dom.serialize());
      console.log('\n=== 页面内容结束 ===\n');
    }

    // 获取所有可能包含链接的元素
    const linkElements = document.querySelectorAll('a[href]');
    console.log(`[${rootUrl}] 在处理后的内容中找到 ${linkElements.length} 个潜在链接`);
    
    // 只在需要时打印链接元素的详细信息
    if (shouldPrintDetails) {
      console.log('\n=== 找到的链接元素 ===\n');
      linkElements.forEach((element, index) => {
        console.log(`[${rootUrl}] 链接元素 ${index + 1} HTML:`, element.outerHTML);
      });
      console.log('\n=== 链接元素结束 ===\n');
      
      linkElements.forEach((element, index) => {
        const href = element.getAttribute('href');
        const text = element.textContent?.trim();
        console.log(`[${rootUrl}] 链接 ${index + 1} 详细信息:`, {
          href,
          text,
          outerHTML: element.outerHTML,
          parentElement: element.parentElement?.tagName,
          parentHTML: element.parentElement?.outerHTML,
          classList: Array.from(element.classList || []),
          是否相对链接: isRelativeUrl(href || '')
        });
      });
    }

    linkElements.forEach(element => {
      try {
        const href = element.getAttribute('href');
        if (!href) return;
        
        // 跳过特殊链接
        if (href.startsWith('#') || 
            href.startsWith('javascript:') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:')) {
          console.log(`[${rootUrl}] 跳过特殊链接: ${href}`);
          return;
        }
        
        // 构建完整URL
        let fullUrl;
        if (isRelativeUrl(href)) {
          // 如果是相对链接，使用根域名构建完整URL
          fullUrl = new URL(href, rootDomain);
          console.log(`[${rootUrl}] 相对路径转换: ${href} -> ${fullUrl.href}`);
        } else {
          // 如果是绝对链接，直接解析
          fullUrl = new URL(href);
        }
        
        // 规范化URL
        fullUrl.hash = '';
        fullUrl.search = '';
        const normalizedUrl = fullUrl.href;
        
        // 调试信息：打印URL判断过程
        console.log(`[${rootUrl}] URL判断:`, {
          原始href: href,
          完整URL: fullUrl.href,
          规范化URL: normalizedUrl,
          是否为子链接: isSubUrl(rootUrl, normalizedUrl)
        });
        
        // 只保留属于根URL的子链接
        if (isSubUrl(rootUrl, normalizedUrl)) {
          // 确保链接末尾不带斜杠，保持一致性
          const finalUrl = normalizedUrl.endsWith('/') ? normalizedUrl.slice(0, -1) : normalizedUrl;
          links.add(finalUrl);
          console.log(`[${rootUrl}] 找到有效子链接: ${finalUrl}`);
        } else {
          console.log(`[${rootUrl}] 忽略非子链接: ${normalizedUrl}`);
        }
      } catch (error) {
        const href = element.getAttribute('href');
        console.log(`[${rootUrl}] 无效链接: ${href}, 错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
  } catch (error) {
    console.error(`[${rootUrl}] 提取链接时出错:`, error);
  }
  
  const uniqueLinks = Array.from(links);
  console.log(`[${rootUrl}] 总共找到 ${uniqueLinks.length} 个有效子链接`);
  return uniqueLinks;
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

    // 使用 article.content 创建新的 DOM
    const articleDom = new JSDOM(article.content, { url });

    return {
      url,
      success: true,
      article,
      dom: articleDom, // 使用处理后的 DOM
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
  currentDepth = 0,
  isRootCall = true // 添加参数标识是否是根调用
): Promise<CleanResult[]> {
  console.log(`\n开始处理: ${rootUrl}`);
  console.log(`当前深度: ${currentDepth}, 已处理页面数: ${processedUrls.size}, 最大页面数: ${maxPages}`);
  
  // 如果达到最大深度或已处理页面数量达到上限，则停止
  if (currentDepth >= maxDepth || processedUrls.size >= maxPages) {
    console.log(`[${rootUrl}] 达到限制条件，停止爬取`);
    console.log(`- 当前深度: ${currentDepth}/${maxDepth}`);
    console.log(`- 已处理页面: ${processedUrls.size}/${maxPages}`);
    return [];
  }
  
  // 如果该URL已经处理过，则跳过
  if (processedUrls.has(rootUrl)) {
    console.log(`[${rootUrl}] 已处理过，跳过`);
    return [];
  }
  
  // 标记该URL为已处理
  processedUrls.add(rootUrl);
  console.log(`[${rootUrl}] 开始解析页面内容`);
  
  // 解析当前页面（带重试机制）
  const result = await retry(() => parsePage(rootUrl));
  let results: CleanResult[] = [];
  
  if (result.success) {
    console.log(`[${rootUrl}] 页面解析成功`);
    const { dom, ...cleanResult } = result;
    results = [cleanResult];
    
    // 如果还可以继续爬取
    if (processedUrls.size < maxPages) {
      // 提取当前页面中的所有链接，只在根调用时打印详细信息
      console.log(`[${rootUrl}] 开始提取子链接`);
      const links = extractLinks(dom, rootUrl, isRootCall);
      
      if (links.length > 0) {
        console.log(`[${rootUrl}] 准备处理 ${links.length} 个子链接，当前深度 ${currentDepth + 1}`);
        // 使用并发池处理子链接，传递 false 表示不是根调用
        const childResults = await asyncPool(
          3,
          links,
          async (link) => crawlRecursively(link, maxDepth, maxPages, processedUrls, currentDepth + 1, false)
        );
        
        results.push(...childResults.flat());
      } else {
        console.log(`[${rootUrl}] 未找到需要处理的子链接`);
      }
    } else {
      console.log(`[${rootUrl}] 已达到最大页面数限制 ${maxPages}，停止处理子链接`);
    }
  } else {
    console.log(`[${rootUrl}] 页面解析失败: ${result.error}`);
    results = [result];
  }
  
  console.log(`[${rootUrl}] 处理完成\n`);
  return results;
}

export async function POST(req: Request) {
  try {
    const { url, maxPages = 10, maxDepth = 3 } = await req.json();
    console.log('\n=== 开始新的爬取任务 ===');
    console.log(`根URL: ${url}`);
    console.log(`最大页面数: ${maxPages}`);
    console.log(`最大深度: ${maxDepth}\n`);
    
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
    
    console.log('\n=== 爬取任务完成 ===');
    console.log(`总处理页面数: ${results.length}`);
    
    // 过滤出成功解析的页面
    const successfulResults = results.filter((result): result is SuccessResult => result.success);
    
    // 过滤出失败的结果
    const errors = results.filter((result): result is ErrorResult => !result.success);

    // 如果没有成功解析任何页面
    if (successfulResults.length === 0) {
      return NextResponse.json({
        error: '未能成功解析任何页面',
        errorDetail: '详细错误信息：\n' + 
          errors.map(e => `${e.url}:\n${e.error}\n${e.errorDetail || ''}`).join('\n\n'),
        errors: errors
      }, { status: 400 });
    }

    // 返回结果
    return NextResponse.json({
      results: successfulResults,
      totalProcessed: processedUrls.size,
      successCount: successfulResults.length,
      errors: errors
    });
  } catch (error) {
    console.error('爬取失败:', error);
    return NextResponse.json(
      { 
        error: '爬取失败',
        errorDetail: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 