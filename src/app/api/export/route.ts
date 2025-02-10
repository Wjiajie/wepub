import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';

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

// 定义消息类型
interface ProgressMessage {
  type: 'progress';
  current: number;
  total: number;
}

interface CompleteMessage {
  type: 'complete';
  data: number[];
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ExportMessage = ProgressMessage | CompleteMessage | ErrorMessage;

// 下载并压缩图片
async function downloadAndCompressImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 使用 sharp 压缩图片
    const compressedImage = await sharp(buffer)
      .resize(1200, 1200, { // 限制最大尺寸
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ // 转换为 JPEG 格式
        quality: 80, // 压缩质量
        progressive: true
      })
      .toBuffer();
    
    return compressedImage;
  } catch (error) {
    console.error('处理图片失败:', url, error);
    return null;
  }
}

// 处理文章内容中的图片和代码块
async function processContent(content: string, zip: JSZip, chapterIndex: number): Promise<string> {
  const dom = new JSDOM(content);
  const document = dom.window.document;
  const imagePromises: Promise<void>[] = [];
  let imageIndex = 0;

  // 处理代码块
  function processCodeBlocks(element: Element) {
    const preElements = element.getElementsByTagName('pre');
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
  }

  // 递归处理所有图片元素
  function processImages(element: Element) {
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      const src = img.getAttribute('src');
      if (!src) return;

      try {
        const imageUrl = new URL(src);
        const imageFileName = `image_${chapterIndex}_${imageIndex}`;
        const fullImageFileName = `${imageFileName}.jpg`; // 统一使用 jpg 格式
        
        // 添加到 manifest
        manifestItems.push(`<item id="${imageFileName}" href="images/${fullImageFileName}" media-type="image/jpeg"/>`);

        // 下载并处理图片
        imagePromises.push(
          downloadAndCompressImage(imageUrl.href).then(imageBuffer => {
            if (imageBuffer) {
              zip.file(`OEBPS/images/${fullImageFileName}`, imageBuffer);
              img.setAttribute('src', `images/${fullImageFileName}`);
              // 确保 img 标签正确闭合
              img.outerHTML = `<img src="images/${fullImageFileName}" alt="${img.alt || ''}" />`;
            } else {
              const placeholder = document.createElement('span');
              placeholder.textContent = '[图片加载失败]';
              placeholder.className = 'image-error';
              img.replaceWith(placeholder);
            }
          })
        );

        imageIndex++;
      } catch (error) {
        console.error('处理图片失败:', src, error);
        const placeholder = document.createElement('span');
        placeholder.textContent = '[图片加载失败]';
        placeholder.className = 'image-error';
        img.replaceWith(placeholder);
      }
    }

    // 递归处理子元素
    for (const child of Array.from(element.children)) {
      processImages(child);
    }
  }

  // 处理所有内容
  processCodeBlocks(document.body);
  processImages(document.body);

  // 等待所有图片处理完成
  await Promise.all(imagePromises);

  // 清理 HTML
  const cleanHtml = document.body.innerHTML
    .replace(/<img([^>]*)>/g, '<img$1 />') // 确保所有 img 标签都正确闭合
    .replace(/&nbsp;/g, ' ') // 替换 &nbsp; 为普通空格
    .replace(/\u00A0/g, ' '); // 替换 non-breaking space 为普通空格

  return cleanHtml;
}

// 存储 manifest 项
const manifestItems: string[] = [];

export async function POST(req: Request) {
  try {
    const { title, articles }: ExportRequest = await req.json();
    
    // 创建一个 TransformStream 用于发送进度信息
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // 用于发送消息的辅助函数
    async function sendMessage(message: ExportMessage) {
      const messageStr = JSON.stringify(message) + '\n';
      await writer.write(encoder.encode(messageStr));
    }

    // 创建响应
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.epub"`,
      },
    });

    // 在后台处理导出
    (async () => {
      try {
        const zip = new JSZip();
        manifestItems.length = 0;

        zip.file('mimetype', 'application/epub+zip');
        zip.folder('OEBPS/images');
        
        // 添加 container.xml
        zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

        // 处理所有文章内容，并报告进度
        const processedArticles = [];
        for (let i = 0; i < articles.length; i++) {
          const { article, url } = articles[i];
          
          // 发送进度信息
          await sendMessage({
            type: 'progress',
            current: i,
            total: articles.length
          });

          const processedContent = await processContent(article.content, zip, i);
          processedArticles.push({ ...article, content: processedContent, url });
        }

        // 创建内容文件
        const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>WePub</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="uid">urn:uuid:${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${articles.map((_, index) => 
      `<item id="chapter${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>`
    ).join('\n    ')}
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    <itemref idref="nav"/>
    ${articles.map((_, index) => `<itemref idref="chapter${index}"/>`).join('\n    ')}
  </spine>
</package>`;

        zip.file('OEBPS/content.opf', contentOpf);

        // 添加导航文件
        const nav = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc">
    <h1>目录</h1>
    <ol>
      ${processedArticles.map(({ title }, index) => 
        `<li><a href="chapter${index}.xhtml">${title}</a></li>`
      ).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;

        zip.file('OEBPS/nav.xhtml', nav);

        // 添加样式文件
        const css = `
body {
  margin: 5% auto;
  max-width: 800px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  padding: 1em;
}
h1 {
  text-align: center;
  margin-bottom: 1em;
}
.source-url {
  font-size: 0.8em;
  color: #666;
  margin: 2em 0;
  padding-top: 1em;
  border-top: 1px solid #eee;
}
.image-error {
  display: inline-block;
  padding: 0.5em;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  margin: 0.5em 0;
  border-radius: 4px;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
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
}`;

        zip.file('OEBPS/style.css', css);

        // 添加章节文件
        processedArticles.forEach(({ title, content, url }, index) => {
          const chapter = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${title}</h1>
  ${content}
  <p class="source-url">原文链接：<a href="${url}">${url}</a></p>
</body>
</html>`;

          zip.file(`OEBPS/chapter${index}.xhtml`, chapter);
        });

        // 生成最终的 EPUB 文件
        const content = await zip.generateAsync({
          type: 'uint8array',
          compression: 'DEFLATE',
          compressionOptions: { level: 9 }
        });

        // 发送完成信息
        await sendMessage({
          type: 'complete',
          data: Array.from(content)
        });

      } catch (error) {
        // 发送错误信息
        await sendMessage({
          type: 'error',
          message: error instanceof Error ? error.message : '导出EPUB失败'
        });
      } finally {
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('导出EPUB失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出EPUB失败' },
      { status: 500 }
    );
  }
} 