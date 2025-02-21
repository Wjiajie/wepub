import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExportRequest {
  contents: Array<{
    url: string;
    title: string;
    content: string;
  }>;
  title: string;
  format: 'html' | 'pdf' | 'epub' | 'md';
  author?: string;
  description?: string;
}

// 准备导航链接
function prepareNavigation(contents: ExportRequest['contents'], currentIndex: number, timestamp: number) {
  const prev = currentIndex > 0 
    ? `<a href="${timestamp}_article_${currentIndex - 1}.html">上一篇: ${contents[currentIndex - 1].title}</a>` 
    : '';
  const next = currentIndex < contents.length - 1 
    ? `<a href="${timestamp}_article_${currentIndex + 1}.html">下一篇: ${contents[currentIndex + 1].title}</a>` 
    : '';
  const index = `<a href="index.html">返回目录</a>`;

  return `<div class="navigation">
    <div class="prev">${prev}</div>
    <div class="index">${index}</div>
    <div class="next">${next}</div>
  </div>`;
}

// 准备单个文章的HTML内容
function prepareArticleHtml(article: ExportRequest['contents'][0], contents: ExportRequest['contents'], index: number, timestamp: number) {
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
  ${prepareNavigation(contents, index, timestamp)}
  <article>
    ${article.content}
  </article>
  <div class="source-link">
    <p>原文链接：<a href="${article.url}" target="_blank">${article.url}</a></p>
  </div>
  ${prepareNavigation(contents, index, timestamp)}
</body>
</html>`;
}

// 准备目录页面
function prepareIndexHtml(contents: ExportRequest['contents'], title: string, author?: string, description?: string) {
  const timestamp = Date.now();
  const toc = contents.map((article, index) => 
    `<li>
      <a href="${timestamp}_article_${index}.html">${article.title}</a>
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
    .meta-info {
      margin: 2em 0;
      padding: 1.5em;
      background: #f8f9fa;
      border-radius: 8px;
      color: #444;
    }
    .meta-info h2 {
      margin-top: 0;
      color: #333;
      font-size: 1.2em;
    }
    .meta-info p {
      margin: 0.5em 0;
    }
    .meta-info .author {
      font-style: italic;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <div class="meta-info">
    ${author ? `<p class="author">作者：${author}</p>` : ''}
    ${description ? `<p class="description">${description}</p>` : ''}
    <p>导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
    <p>共收录 ${contents.length} 篇文章</p>
  </div>

  <ul class="toc">
    ${toc}
  </ul>
</body>
</html>`;
}

// 准备单个 Markdown 文章
function prepareMarkdownArticle(article: ExportRequest['contents'][0], index: number, totalArticles: number, timestamp: number) {
  const navigation = [];
  if (index > 0) {
    navigation.push(`[上一篇](${timestamp}_article_${index - 1}.md)`);
  }
  navigation.push('[返回目录](index.md)');
  if (index < totalArticles - 1) {
    navigation.push(`[下一篇](${timestamp}_article_${index + 1}.md)`);
  }

  return `# ${article.title}

${navigation.join(' | ')}

---

${article.content}

---

${navigation.join(' | ')}

> 原文链接：[${article.url}](${article.url})
`;
}

// 创建临时文件夹
async function createTempDir(prefix: string): Promise<string> {
  const tempDir = join('/tmp', `${prefix}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

// 清理临时文件夹
async function cleanupTempDir(dir: string) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.error('清理临时文件夹失败:', error);
  }
}

// 使用 percollate 转换格式
async function convertWithPercollate(htmlFile: string, format: 'pdf' | 'epub' | 'md', outputFile: string, author?: string) {
  let cmd = `percollate ${format}`;
  
  // epub 格式需要特殊处理
  if (format === 'epub') {
    cmd += ` --output "${outputFile}"`;
    if (author) {
      cmd += ` --author "${author}"`;
    }
    cmd += ` "${htmlFile}"`;
  } else if (format === 'pdf') {
    // PDF 格式特殊处理，添加 --no-toc 参数去除目录页
    cmd += ` --no-toc --no-cover --output "${outputFile}" "${htmlFile}"`;
  } else {
    // 其他格式保持原样
    cmd += ` --output "${outputFile}" "${htmlFile}"`;
  }
  
  await execAsync(cmd);
}

export async function POST(req: Request) {
  const tempDir = await createTempDir('wepub');
  
  try {
    const { contents, title, format = 'html', author, description } = (await req.json()) as ExportRequest & { description?: string };
    const timestamp = Date.now();
    
    // HTML 格式使用现有的 ZIP 导出逻辑
    if (format === 'html') {
      const zip = new JSZip();
      zip.file('index.html', prepareIndexHtml(contents, title, author, description));
      contents.forEach((article, index) => {
        zip.file(`${timestamp}_article_${index}.html`, prepareArticleHtml(article, contents, index, timestamp));
      });
      const zipBlob = await zip.generateAsync({type: 'nodebuffer'});
      return new Response(zipBlob, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.zip`,
        },
      });
    }

    // Markdown 格式也使用 ZIP 导出
    if (format === 'md') {
      const zip = new JSZip();
      let indexContent = `# ${title}\n\n`;
      
      // 添加元信息
      if (author) {
        indexContent += `作者：${author}\n\n`;
      }
      if (description) {
        indexContent += `${description}\n\n`;
      }
      indexContent += `导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
      indexContent += `共收录 ${contents.length} 篇文章\n\n`;
      indexContent += `## 目录\n\n`;
      
      zip.file('index.md', indexContent + contents.map((article, index) => 
        `- [${article.title}](${timestamp}_article_${index}.md) - [原文](${article.url})`
      ).join('\n'));
      
      contents.forEach((article, index) => {
        zip.file(`${timestamp}_article_${index}.md`, prepareMarkdownArticle(article, index, contents.length, timestamp));
      });
      const zipBlob = await zip.generateAsync({type: 'nodebuffer'});
      return new Response(zipBlob, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.zip`,
        },
      });
    }
    
    // 其他格式需要使用 percollate 处理
    if (format === 'epub') {
      // 为每篇文章创建单独的HTML文件
      const coverHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${author ? `<meta name="author" content="${author}">` : ''}
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              padding: 2em;
              max-width: 50em;
              margin: 0 auto;
            }
            .cover {
              text-align: center;
              padding: 3em 0;
            }
            .cover h1 {
              font-size: 2.5em;
              margin-bottom: 0.5em;
            }
            .meta-info {
              margin: 2em auto;
              max-width: 40em;
              text-align: left;
              color: #666;
            }
            .meta-info p {
              margin: 0.5em 0;
            }
          </style>
        </head>
        <body>
          <div class="cover">
            <h1>${title}</h1>
            <div class="meta-info">
              ${author ? `<p>作者：${author}</p>` : ''}
              ${description ? `<p>${description}</p>` : ''}
              <p>导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
              <p>共收录 ${contents.length} 篇文章</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const inputFile = join(tempDir, 'input.html');
      await writeFile(inputFile, coverHtml);
      
      // 为每篇文章创建单独的HTML文件
      for (let i = 0; i < contents.length; i++) {
        const article = contents[i];
        const articleHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${article.title}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${author ? `<meta name="author" content="${author}">` : ''}
          </head>
          <body>
            <article id="article_${i}">
              ${article.content}
              <p class="source-link">原文链接：<a href="${article.url}">${article.url}</a></p>
            </article>
          </body>
          </html>
        `;
        const articleFile = join(tempDir, `article_${i}.html`);
        await writeFile(articleFile, articleHtml);
      }
      
      const outputFile = join(tempDir, `output.${format}`);
      const htmlFiles = [inputFile, ...Array.from({length: contents.length}, (_, i) => join(tempDir, `article_${i}.html`))];
      
      // 使用 convertWithPercollate 函数处理 EPUB 导出
      await convertWithPercollate(htmlFiles.join('" "'), format, outputFile, author);
      
      const result = await readFile(outputFile);
      return new Response(result, {
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.epub`,
        },
      });
    } else {
      // PDF 格式的处理
      // 创建封面和目录页
      const coverHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${author ? `<meta name="author" content="${author}">` : ''}
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              padding: 2em;
              max-width: 50em;
              margin: 0 auto;
            }
            .cover {
              text-align: center;
              padding: 3em 0;
            }
            .cover h1 {
              font-size: 2.5em;
              margin-bottom: 0.5em;
            }
            .cover .author {
              font-size: 1.2em;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="cover">
            <h1>${title}</h1>
            ${author ? `<p class="author">作者：${author}</p>` : ''}
            <p>共收录 ${contents.length} 篇文章</p>
          </div>
        </body>
        </html>
      `;

      const tocHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>目录</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              padding: 2em;
              max-width: 50em;
              margin: 0 auto;
            }
            .toc h1 {
              margin-bottom: 1em;
            }
            .toc ul {
              list-style: none;
              padding: 0;
            }
            .toc li {
              margin: 0.5em 0;
              display: flex;
              align-items: baseline;
            }
            .toc a {
              color: #000;
              text-decoration: none;
              flex: 1;
            }
            .toc .dots {
              border-bottom: 1px dotted #999;
              margin: 0 0.5em;
              flex: 1;
            }
          </style>
        </head>
        <body>
          <div class="toc">
            <h1>目录</h1>
            <ul>
              ${contents.map((article, index) => `
                <li>
                  <a href="#article_${index}">${article.title}</a>
                  <span class="dots"></span>
                </li>
              `).join('\n')}
            </ul>
          </div>
        </body>
        </html>
      `;

      // 写入封面和目录文件
      const coverFile = join(tempDir, 'cover.html');
      const tocFile = join(tempDir, 'toc.html');
      await writeFile(coverFile, coverHtml);
      await writeFile(tocFile, tocHtml);

      // 为每篇文章创建单独的HTML文件
      for (let i = 0; i < contents.length; i++) {
        const article = contents[i];
        const articleHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${article.title}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                padding: 2em;
                max-width: 50em;
                margin: 0 auto;
              }
              .source-link {
                color: #666;
                font-size: 0.9em;
                margin-top: 2em;
              }
            </style>
          </head>
          <body>
            <article id="article_${i}">
              ${article.content}
              <p class="source-link">原文链接：<a href="${article.url}">${article.url}</a></p>
            </article>
          </body>
          </html>
        `;
        const articleFile = join(tempDir, `article_${i}.html`);
        await writeFile(articleFile, articleHtml);
      }

      const outputFile = join(tempDir, `output.${format}`);
      const htmlFiles = [
        coverFile,
        tocFile,
        ...Array.from({length: contents.length}, (_, i) => join(tempDir, `article_${i}.html`))
      ];

      // 使用 convertWithPercollate 函数处理 PDF 导出
      await convertWithPercollate(htmlFiles.join('" "'), format, outputFile, author);

      const result = await readFile(outputFile);
      return new Response(result, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.pdf`,
        },
      });
    }
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { 
        error: '导出失败',
        errorDetail: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
} 