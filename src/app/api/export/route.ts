import { NextResponse } from 'next/server';
import JSZip from 'jszip';

interface ExportRequest {
  contents: Array<{
    url: string;
    title: string;
    content: string;
  }>;
  title: string;
  author?: string;
}

// 准备导航链接
function prepareNavigation(contents: ExportRequest['contents'], currentIndex: number) {
  const prev = currentIndex > 0 
    ? `<a href="article_${currentIndex - 1}.html">上一篇: ${contents[currentIndex - 1].title}</a>` 
    : '';
  const next = currentIndex < contents.length - 1 
    ? `<a href="article_${currentIndex + 1}.html">下一篇: ${contents[currentIndex + 1].title}</a>` 
    : '';
  const index = `<a href="index.html">返回目录</a>`;

  return `<div class="navigation">
    <div class="prev">${prev}</div>
    <div class="index">${index}</div>
    <div class="next">${next}</div>
  </div>`;
}

// 准备单个文章的HTML内容
function prepareArticleHtml(article: ExportRequest['contents'][0], contents: ExportRequest['contents'], index: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      padding: 1em;
      max-width: 50em;
      margin: 0 auto;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    pre {
      overflow-x: auto;
      padding: 1em;
      background: #f5f5f5;
    }
    code {
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }
    .navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 2em 0;
      padding: 1em;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .navigation a {
      color: #0066cc;
      text-decoration: none;
    }
    .navigation a:hover {
      text-decoration: underline;
    }
    .source-link {
      color: #666;
      font-size: 0.9em;
      margin-top: 1em;
    }
    .source-link a {
      color: #0066cc;
      text-decoration: none;
    }
    .source-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${prepareNavigation(contents, index)}
  <article>
    <h1>${article.title}</h1>
    ${article.content}
  </article>
  <div class="source-link">
    <p>原文链接：<a href="${article.url}" target="_blank">${article.url}</a></p>
  </div>
  ${prepareNavigation(contents, index)}
</body>
</html>`;
}

// 准备目录页面
function prepareIndexHtml(contents: ExportRequest['contents'], title: string) {
  const toc = contents.map((article, index) => 
    `<li>
      <a href="article_${index}.html">${article.title}</a>
      <div class="article-url">${article.url}</div>
    </li>`
  ).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      padding: 1em;
      max-width: 50em;
      margin: 0 auto;
    }
    .toc {
      list-style: none;
      padding: 0;
    }
    .toc li {
      margin: 1em 0;
      padding: 1em;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .toc a {
      color: #0066cc;
      text-decoration: none;
      font-size: 1.1em;
      font-weight: 500;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    .article-url {
      color: #666;
      font-size: 0.9em;
      margin-top: 0.5em;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>共收录 ${contents.length} 篇文章</p>
  <ul class="toc">
    ${toc}
  </ul>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { contents, title } = (await req.json()) as ExportRequest;
    
    // 创建一个新的 ZIP 文件
    const zip = new JSZip();
    
    // 添加目录页面
    zip.file('index.html', prepareIndexHtml(contents, title));
    
    // 添加所有文章
    contents.forEach((article, index) => {
      zip.file(`article_${index}.html`, prepareArticleHtml(article, contents, index));
    });
    
    // 生成 ZIP 文件
    const zipBlob = await zip.generateAsync({type: 'nodebuffer'});
    
    // 返回 ZIP 文件
    return new Response(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.zip`,
      },
    });
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { 
        error: '导出失败',
        errorDetail: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 