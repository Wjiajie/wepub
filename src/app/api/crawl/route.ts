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
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      return {
        url,
        success: false,
        error: '无法解析文章内容',
      };
    }
    
    return {
      url,
      success: true,
      article,
      dom,
    };
  } catch (error) {
    console.error(`解析页面失败 ${url}:`, error);
    return {
      url,
      success: false,
      error: '解析失败',
    };
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
  
  // 解析当前页面
  const result = await parsePage(rootUrl);
  let results: CleanResult[] = [];
  
  if (result.success) {
    const { dom, ...cleanResult } = result;
    results = [cleanResult];
    
    // 如果还可以继续爬取
    if (processedUrls.size < maxPages) {
      // 提取当前页面中的所有链接
      const links = extractLinks(dom, rootUrl);
      
      // 并行处理所有子链接
      const childResults = await Promise.all(
        links.map(link => 
          crawlRecursively(link, maxDepth, maxPages, processedUrls, currentDepth + 1)
        )
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
    
    // 开始递归爬取
    const processedUrls = new Set<string>();
    const results = await crawlRecursively(url, maxDepth, maxPages, processedUrls);
    
    // 过滤出成功解析的页面
    const successfulResults = results.filter((result): result is SuccessResult => result.success);
    
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
      { error: '爬取失败' },
      { status: 500 }
    );
  }
} 