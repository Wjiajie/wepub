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

interface ParseResult {
  url: string;
  success: boolean;
  article?: Article;
  processedDom?: JSDOM;  // 用于链接提取的 DOM
  error?: string;
  errorDetail?: string;
}

interface CrawlError {
  url: string;
  error: string;
  errorDetail?: string;
}

// 辅助函数：判断是否为相对链接
function isRelativeUrl(url: string): boolean {
  // 如果是以 / 开头，或者不包含 :// 的链接，就认为是相对链接
  return url.startsWith('/') || !url.includes('://');
}

// 辅助函数：检查URL是否是根URL的子链接
function isSubUrl(rootUrl: string, testUrl: string): boolean {
  try {
    const root = new URL(rootUrl);
    const test = new URL(testUrl);
    
    // 首先检查域名是否相同
    if (test.hostname !== root.hostname) {
      console.log(`[子链接检查] 域名不匹配:`, {
        根域名: root.hostname,
        测试域名: test.hostname
      });
      return false;
    }

    // 规范化URL（移除末尾的斜杠）
    const normalizedRootUrl = rootUrl.replace(/\/$/, '');
    const normalizedTestUrl = testUrl.replace(/\/$/, '');
    
    // 如果测试URL等于根URL，这不是子链接（是同一个页面）
    if (normalizedTestUrl === normalizedRootUrl) {
      console.log(`[子链接检查] 相同页面:`, {
        根URL: normalizedRootUrl,
        测试URL: normalizedTestUrl
      });
      return false;
    }
    
    // 判断测试URL是否包含根URL
    const isSubLink = normalizedTestUrl.startsWith(normalizedRootUrl);
    console.log(`[子链接检查] 结果:`, {
      根URL: normalizedRootUrl,
      测试URL: normalizedTestUrl,
      是否为子链接: isSubLink
    });
    return isSubLink;
  } catch (error) {
    console.log(`[子链接检查] URL解析错误:`, {
      根URL: rootUrl,
      测试URL: testUrl,
      错误: error instanceof Error ? error.message : '未知错误'
    });
    return false;
  }
}

// 辅助函数：提取所有链接
function extractLinks(parseResult: ParseResult, rootUrl: string, shouldPrintDetails: boolean = false): string[] {
  const links = new Set<string>();
  if (!parseResult.processedDom) return Array.from(links);
  
  const document = parseResult.processedDom.window.document;
  
  try {
    // 只在需要时打印完整的 HTML 内容
    if (shouldPrintDetails) {
      console.log('\n=== 处理后的页面内容 ===\n');
      console.log(parseResult.processedDom.serialize());
      console.log('\n=== 页面内容结束 ===\n');
    }

    // 获取所有可能包含链接的元素
    const linkElements = document.querySelectorAll('a[href]');
    console.log(`[${rootUrl}] 在处理后的内容中找到 ${linkElements.length} 个潜在链接`);
    
    // 处理每个链接
    linkElements.forEach((element, index) => {
      const href = element.getAttribute('href');
      if (!href) return;

      // 跳过锚点链接（页面内部导航）
      if (href.startsWith('#')) {
        console.log(`[链接处理] 第 ${index + 1}/${linkElements.length} 个链接:`, {
          原始href: href,
          链接文本: element.textContent?.trim() || '无文本',
          跳过原因: '锚点链接（页面内部导航）'
        });
        return;
      }

      try {
        // 将相对URL转换为绝对URL
        const absoluteUrl = new URL(href, rootUrl).href;
        console.log(`\n[链接处理] 第 ${index + 1}/${linkElements.length} 个链接:`, {
          原始href: href,
          绝对URL: absoluteUrl,
          链接文本: element.textContent?.trim() || '无文本',
          父元素: element.parentElement?.tagName || '无父元素',
          是否为相对链接: isRelativeUrl(href)
        });
        
        // 检查是否为子链接
        if (isSubUrl(rootUrl, absoluteUrl)) {
          links.add(absoluteUrl);
          console.log(`[链接处理] ✅ 已添加为有效子链接`);
        } else {
          console.log(`[链接处理] ❌ 不是有效子链接`);
        }
      } catch (error) {
        console.error(`[${rootUrl}] 处理链接时出错:`, {
          href,
          错误: error instanceof Error ? error.message : '未知错误'
        });
      }
    });

    console.log(`\n[${rootUrl}] 链接处理总结:`, {
      总链接数: linkElements.length,
      有效子链接数: links.size,
      有效子链接列表: Array.from(links)
    });

  } catch (error) {
    console.error(`[${rootUrl}] 提取链接时出错:`, error);
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

    // 创建原始 DOM
    const dom = new JSDOM(html, { url });

    // 创建用于展示的 DOM（完全过滤）
    const displayReader = new Readability(dom.window.document.cloneNode(true) as Document);
    const displayArticle = displayReader.parse();
    
    if (!displayArticle) {
      return {
        url,
        success: false,
        error: '无法解析文章内容\n可能原因：\n1. 页面结构不符合文章格式\n2. 页面内容可能需要登录才能访问\n3. 页面可能是一个列表或首页',
      };
    }

    // 检查解析后的内容是否为空
    if (!displayArticle.content || displayArticle.content.trim().length === 0) {
      throw new Error('解析后的内容为空\n可能原因：\n1. 文章内容可能是动态加载的\n2. 文章可能需要订阅或登录\n3. 网站可能使用了特殊的内容保护机制');
    }

    // 始终使用原始DOM进行链接提取
    const processedDom = dom;

    return {
      url,
      success: true,
      article: displayArticle,  // 用于展示的文章内容
      processedDom: processedDom,  // 用于链接提取的 DOM
    };
  } catch (error) {
    console.error(`解析页面失败: ${url}`, error);
    return {
      url,
      success: false,
      error: '解析失败',
      errorDetail: error instanceof Error ? error.message : '未知错误'
    };
  }
}

// 辅助函数：递归爬取
async function crawlRecursively(
  rootUrl: string,
  maxPages: number,
  maxDepth: number,
  concurrencyLimit: number = 1,
  visited = new Set<string>(),
  currentDepth = 0,
  results: ParseResult[] = [],
  errors: CrawlError[] = []
): Promise<{ results: ParseResult[], errors: CrawlError[] }> {
  // 如果maxPages为0，立即返回空结果
  if (maxPages === 0) {
    console.log(`[${rootUrl}] 最大页面数设置为0，跳过所有解析`);
    return { results, errors };
  }
  
  // 基本情况：达到最大深度或页面数限制（当maxPages为-1时表示无限制）
  if (currentDepth >= maxDepth || (maxPages > 0 && visited.size >= maxPages)) {
    return { results, errors };
  }

  // 解析当前页面
  console.log(`[${rootUrl}] 开始解析页面，当前深度: ${currentDepth}, 已处理页面数: ${visited.size}/${maxPages > 0 ? maxPages : '无限制'}`);
  const parseResult = await parsePage(rootUrl);
  visited.add(rootUrl);

  if (!parseResult.success) {
    errors.push({
      url: rootUrl,
      error: parseResult.error || '未知错误',
      errorDetail: parseResult.errorDetail
    });
    return { results, errors };
  }

  results.push(parseResult);

  // 如果还没有达到最大页面数，则提取并处理子链接
  if (maxPages <= 0 || visited.size < maxPages) {
    const links = extractLinks(parseResult, rootUrl);
    console.log(`[${rootUrl}] 找到 ${links.length} 个子链接`);

    // 过滤掉已访问的链接
    const unvisitedLinks = links.filter(link => !visited.has(link));
    
    // 计算还可以处理的页面数量
    const remainingPages = maxPages > 0 ? maxPages - visited.size : Number.MAX_SAFE_INTEGER;
    // 只取需要的数量的链接
    const linksToProcess = unvisitedLinks.slice(0, remainingPages);

    console.log(`[${rootUrl}] 将处理 ${linksToProcess.length} 个子链接，剩余配额: ${maxPages > 0 ? remainingPages : '无限制'}`);

    // 并行处理选定的子链接，但限制并发数
    for (let i = 0; i < linksToProcess.length; i += concurrencyLimit) {
      const batch = linksToProcess.slice(i, i + concurrencyLimit)
        .map(link => 
          crawlRecursively(link, maxPages, maxDepth, concurrencyLimit, visited, currentDepth + 1, results, errors)
        );

      await Promise.all(batch);

      // 如果已经达到最大页面数，则停止处理（当maxPages为-1时不会触发）
      if (maxPages > 0 && visited.size >= maxPages) {
        console.log(`[${rootUrl}] 已达到最大页面数限制 ${maxPages}，停止处理剩余链接`);
        break;
      }
    }
  }

  return { results, errors };
}

export async function POST(req: Request) {
  try {
    const { url, maxPages = -1, maxDepth = 3, concurrencyLimit = 1 } = await req.json();

    // 验证并发数范围
    const validConcurrencyLimit = Math.min(Math.max(1, concurrencyLimit), 8);

    // 如果maxPages为0，直接返回空结果
    if (maxPages === 0) {
      console.log(`[${url}] 最大页面数设置为0，返回空结果`);
      return NextResponse.json({
        results: [],
        totalProcessed: 0,
        successCount: 0,
        errors: []
      });
    }

    const { results, errors } = await crawlRecursively(url, maxPages, maxDepth, validConcurrencyLimit);

    // 过滤出成功的结果
    const successfulResults = results.filter(result => result.success);

    return NextResponse.json({
      results: successfulResults.map(result => ({
        url: result.url,
        article: result.article
      })),
      totalProcessed: results.length,
      successCount: successfulResults.length,
      errors
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