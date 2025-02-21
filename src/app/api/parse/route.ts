import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    // 获取网页内容
    const response = await fetch(url);
    const html = await response.text();

    // 使用jsdom创建DOM对象
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    
    // 解析文章内容
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: '无法解析文章内容' },
        { status: 400 }
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('解析失败:', error);
    return NextResponse.json(
      { 
        error: '解析失败',
        errorDetail: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 