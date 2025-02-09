import { NextResponse } from 'next/server';
import JSZip from 'jszip';

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

export async function POST(req: Request) {
  try {
    const { title, articles }: ExportRequest = await req.json();
    
    const zip = new JSZip();

    // 添加 mimetype 文件
    zip.file('mimetype', 'application/epub+zip');

    // 添加 META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

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
      ${articles.map(({ article }, index) => 
        `<li><a href="chapter${index}.xhtml">${article.title}</a></li>`
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
}`;

    zip.file('OEBPS/style.css', css);

    // 添加章节文件
    articles.forEach(({ article, url }, index) => {
      const chapter = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${article.title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${article.title}</h1>
  ${article.content}
  <p class="source-url">原文链接：<a href="${url}">${url}</a></p>
</body>
</html>`;

      zip.file(`OEBPS/chapter${index}.xhtml`, chapter);
    });

    // 生成ZIP文件
    const content = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
    
    // 返回文件内容
    return new NextResponse(content, {
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