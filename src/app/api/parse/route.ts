import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { supabase } from '@/lib/supabase';

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

    // 检查环境变量是否配置
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('警告: Supabase环境变量未配置，跳过保存到数据库的步骤');
      return NextResponse.json(article);
    }

    // 保存到Supabase
    try {
      const { data, error } = await supabase
        .from('articles')
        .insert([
          {
            url,
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            author: article.byline,
            length: article.length,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('保存文章失败:', error);
        // 即使保存失败，仍然返回解析的文章内容
        return NextResponse.json(article);
      }

      return NextResponse.json(data);
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      // 返回解析的文章内容，而不是错误
      return NextResponse.json(article);
    }
  } catch (error) {
    console.error('解析文章失败:', error);
    return NextResponse.json(
      { error: '解析文章失败' },
      { status: 500 }
    );
  }
} 