import { NextResponse } from 'next/server';
import { RSSFeed } from '@/core/interfaces/content.interface';
import * as xml2js from 'xml2js';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

interface RawRSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  published?: string;
  author?: string;
  'dc:creator'?: string;
}

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
  error?: string;
  errorDetail?: string;
}

async function fetchWithTimeout(url: string, timeout = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml,application/atom+xml,text/xml,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function parseRSSFeed(xml: string): Promise<RSSFeed> {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xml);
  
  const channel = result.rss?.channel || result.feed;
  if (!channel) {
    throw new Error('无效的RSS格式');
  }

  // 确保items是数组，即使只有一个项目
  const items = (Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [])
    .filter((item: RawRSSItem) => item && item.title && item.link)
    .map((item: RawRSSItem) => ({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate || item.published,
      author: item.author || item['dc:creator']
    }));

  return {
    title: channel.title || '未命名RSS源',
    description: channel.description || '',
    items
  };
}

// 辅助函数：解析单个文章页面
async function parseArticle(url: string): Promise<ParseResult> {
  try {
    console.log(`[RSS解析详情] 开始解析文章: ${url}`);
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
      console.log(`[RSS解析详情] HTTP请求失败: ${url}, 状态码: ${response.status}`);
      throw new Error(`HTTP 请求失败: ${response.status} ${response.statusText}`);
    }

    // 检查内容类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      console.log(`[RSS解析详情] 不支持的内容类型: ${url}, 类型: ${contentType || '未知'}`);
      throw new Error(`不支持的内容类型: ${contentType || '未知'}`);
    }

    const html = await response.text();
    
    // 检查HTML内容是否为空
    if (!html || html.trim().length === 0) {
      console.log(`[RSS解析详情] 页面内容为空: ${url}`);
      throw new Error('页面内容为空');
    }

    console.log(`[RSS解析详情] 获取到HTML内容: ${url}, 长度: ${html.length}`);

    // 创建DOM
    const dom = new JSDOM(html, { url });

    // 使用Readability解析文章内容
    const reader = new Readability(dom.window.document.cloneNode(true) as Document);
    const article = reader.parse();
    
    if (!article) {
      console.log(`[RSS解析详情] Readability解析失败: ${url}`);
      return {
        url,
        success: false,
        error: '无法解析文章内容',
      };
    }

    console.log(`[RSS解析详情] 解析成功: ${url}, 标题: ${article.title}, 内容长度: ${article.content.length}`);
    return {
      url,
      success: true,
      article,
    };
  } catch (error) {
    console.error(`[RSS解析详情] 解析文章失败: ${url}`, error);
    return {
      url,
      success: false,
      error: '解析失败',
      errorDetail: error instanceof Error ? error.message : '未知错误'
    };
  }
}

export async function POST(req: Request) {
  try {
    const { url, maxPages = -1, parseContent = true } = await req.json();

    // 获取RSS内容
    console.log(`[RSS解析] 开始获取RSS源: ${url}`);
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`获取RSS源失败: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('xml') && !contentType?.includes('rss')) {
      throw new Error('不是有效的RSS源');
    }

    console.log(`[RSS解析] 成功获取RSS源，开始解析XML`);
    const xml = await response.text();
    const feed = await parseRSSFeed(xml);

    // 如果设置了最大页面数限制，则限制返回的链接数量
    const limitedItems = maxPages > 0 ? feed.items.slice(0, maxPages) : feed.items;
    
    console.log(`[RSS解析] 从RSS源 ${url} 中找到 ${feed.items.length} 个链接，返回 ${limitedItems.length} 个链接`);

    // 如果需要解析文章内容
    if (parseContent) {
      console.log(`[RSS解析] 开始解析文章内容...`);
      
      // 限制并发请求数量
      const concurrencyLimit = 3;
      const results = [];
      
      for (let i = 0; i < limitedItems.length; i += concurrencyLimit) {
        const batch = limitedItems.slice(i, i + concurrencyLimit);
        console.log(`[RSS解析] 处理批次 ${Math.floor(i/concurrencyLimit) + 1}/${Math.ceil(limitedItems.length/concurrencyLimit)}, 当前进度: ${i}/${limitedItems.length}`);
        
        const batchPromises = batch.map(item => {
          console.log(`[RSS解析] 开始解析文章: ${item.title} (${item.link})`);
          return parseArticle(item.link);
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // 记录每个批次的结果
        const batchSuccessCount = batchResults.filter(r => r.success).length;
        console.log(`[RSS解析] 批次 ${Math.floor(i/concurrencyLimit) + 1} 完成，成功: ${batchSuccessCount}/${batch.length}`);
        
        results.push(...batchResults);
      }
      
      // 将解析结果与RSS项目合并
      const articlesWithContent = results.map((result, index) => {
        const item = limitedItems[index];
        const isSuccess = result.success;
        if (isSuccess) {
          console.log(`[RSS解析] 文章解析成功: ${item.title}, 内容长度: ${result.article?.length || 0}`);
        } else {
          console.log(`[RSS解析] 文章解析失败: ${item.title}, 错误: ${result.error}`);
        }
        
        return {
          url: item.link,
          article: result.success ? result.article : {
            title: item.title,
            content: item.description || '<p>无法解析内容</p>',
            textContent: item.description || '无法解析内容',
            length: (item.description || '').length,
            excerpt: item.description,
            byline: item.author
          },
          success: result.success
        };
      });
      
      const successCount = results.filter(r => r.success).length;
      console.log(`[RSS解析] 全部完成，成功解析 ${successCount}/${limitedItems.length} 篇文章`);
      
      return NextResponse.json({
        results: articlesWithContent,
        totalProcessed: feed.items.length,
        successCount: successCount
      });
    } else {
      // 直接返回RSS中的链接信息
      console.log(`[RSS解析] 不解析文章内容，直接返回链接信息`);
      return NextResponse.json({
        feed: {
          title: feed.title,
          description: feed.description,
        },
        links: limitedItems.map(item => ({
          url: item.link,
          title: item.title,
          description: item.description,
          pubDate: item.pubDate,
          author: item.author
        })),
        totalLinks: feed.items.length,
        returnedLinks: limitedItems.length
      });
    }
  } catch (error) {
    console.error('RSS处理失败:', error);
    return NextResponse.json(
      {
        error: '处理RSS源失败',
        errorDetail: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 