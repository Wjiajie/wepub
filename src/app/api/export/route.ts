import { NextResponse } from 'next/server';
import epubGen from 'epub-gen-memory';
import { JSDOM } from 'jsdom';

interface Article {
  title: string;
  content: string;
  byline?: string;
  excerpt?: string;
}

interface ExportRequest {
  title: string;
  articles: {
    url: string;
    article: Article;
  }[];
}

// 处理文章内容中的图片和代码块
async function processContent(content: string): Promise<string> {
  const dom = new JSDOM(`<!DOCTYPE html><body>${content}</body>`);
  const document = dom.window.document;

  // 处理代码块
  const preElements = document.getElementsByTagName('pre');
  for (const pre of Array.from(preElements)) {
    // 确保代码块内容被正确转义
    const codeContent = pre.innerHTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    // 重新包装代码块
    pre.innerHTML = `<code>${codeContent}</code>`;
    
    // 添加样式类
    pre.className = pre.className + ' code-block';
  }

  // 清理 HTML
  const cleanHtml = document.body.innerHTML
    .replace(/&nbsp;/g, ' ') // 替换 &nbsp; 为普通空格
    .replace(/\u00A0/g, ' '); // 替换 non-breaking space 为普通空格

  return cleanHtml;
}

export async function POST(req: Request) {
  try {
    const { title, articles }: ExportRequest = await req.json();

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: '没有选择要导出的文章' },
        { status: 400 }
      );
    }

    console.log('开始处理文章，数量:', articles.length);

    // 处理所有文章内容
    const chapters = await Promise.all(
      articles.map(async ({ article, url }) => {
        console.log('处理文章:', article.title);
        const processedContent = await processContent(article.content);
        return {
          title: article.title,
          content: processedContent + 
                `<p class="source-url">原文链接：<a href="${url}">${url}</a></p>`
        };
      })
    );

    console.log('文章处理完成，开始生成电子书');

    // 电子书配置选项
    const options = {
      title,
      author: 'WePub',
      publisher: 'WePub',
      description: '由 WePub 生成的电子书',
      version: 3,
      date: new Date().toISOString().split('T')[0],
      lang: 'zh-CN',
      tocTitle: '目录',
      appendChapterTitles: true,
      css: `
        body {
          font-family: "Microsoft YaHei", Arial, sans-serif;
          line-height: 1.6;
          padding: 20px;
          color: #333;
          margin: 5% auto;
          max-width: 800px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
          margin-top: 30px;
          text-align: center;
        }
        h2 {
          color: #34495e;
          margin-top: 25px;
        }
        h3 {
          color: #7f8c8d;
        }
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1em auto;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .source-url {
          font-size: 0.8em;
          color: #666;
          margin: 2em 0;
          padding-top: 1em;
          border-top: 1px solid #eee;
        }
        blockquote {
          border-left: 4px solid #3498db;
          margin: 20px 0;
          padding: 10px 20px;
          background: #f8f9fa;
          color: #444;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border: 1px solid #ddd;
        }
        th {
          background: #f5f6fa;
          color: #2c3e50;
        }
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        .code-block {
          background-color: #f6f8fa;
          border-radius: 6px;
          padding: 1em;
          margin: 1em 0;
          overflow-x: auto;
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 0.9em;
          line-height: 1.45;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        code {
          font-family: inherit;
        }
      `
    };

    console.log('开始生成EPUB文件');

    // 生成电子书
    const epubData = await epubGen(options, chapters);

    console.log('EPUB文件生成完成，大小:', epubData.length, '字节');

    // 返回生成的电子书数据
    return new Response(epubData, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.epub"`,
      },
    });

  } catch (error) {
    console.error('导出EPUB失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出EPUB失败' },
      { status: 500 }
    );
  }
} 