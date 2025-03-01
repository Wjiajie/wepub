import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { RSSFeed } from '@/core/interfaces/content.interface';
import * as xml2js from 'xml2js';

interface RawRSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  published?: string;
  author?: string;
  'dc:creator'?: string;
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

  const items = (Array.isArray(channel.item) ? channel.item : [channel.item])
    .filter((item: RawRSSItem) => item && item.title && item.link)
    .map((item: RawRSSItem) => ({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate || item.published,
      author: item.author || item['dc:creator']
    }));

  return {
    title: channel.title,
    description: channel.description,
    items
  };
}

async function parseArticle(url: string) {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('无法解析文章内容');
    }

    return {
      url,
      success: true,
      article: {
        title: article.title || '无标题',
        content: article.content || '无内容',
        byline: article.byline
      }
    };
  } catch (error) {
    console.error(`解析文章失败: ${url}`, error);
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
    const { url } = await req.json();

    // 获取RSS内容
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`获取RSS源失败: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('xml') && !contentType?.includes('rss')) {
      throw new Error('不是有效的RSS源');
    }

    const xml = await response.text();
    const feed = await parseRSSFeed(xml);

    // 并行处理所有文章
    const articles = await Promise.all(
      feed.items.map(item => parseArticle(item.link))
    );

    // 过滤掉解析失败的文章
    const successfulArticles = articles.filter(article => article.success);

    return NextResponse.json({
      feed: {
        title: feed.title,
        description: feed.description,
      },
      results: successfulArticles.map(article => article.article),
      totalProcessed: feed.items.length,
      successCount: successfulArticles.length,
    });
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