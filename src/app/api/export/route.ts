import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Server } from 'http';

const execAsync = promisify(exec);

interface ExportRequest {
  contents: Array<{
    url: string;
    title: string;
    content: string;
  }>;
  format: string;
  title: string;
  author?: string;
}

// 扩展全局类型定义
declare global {
  // eslint-disable-next-line no-var
  var __tempServer: Server | undefined;
}

// 准备单个文章的HTML内容
function prepareArticleHtml(article: ExportRequest['contents'][0]) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <article>
    <h1>${article.title}</h1>
    ${article.content}
  </article>
</body>
</html>`;
}

// 准备完整的HTML内容
function prepareFullHtml(contents: ExportRequest['contents']) {
  return contents.map(prepareArticleHtml).join('\n\n');
}

// 创建一个简单的HTTP服务器来提供HTML内容
async function serveHtmlContent(html: string, port: number): Promise<void> {
  const http = await import('http');
  
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    
    server.listen(port, 'localhost');
    
    server.on('listening', () => resolve());
    server.on('error', reject);
    
    // 保存server引用以便后续关闭
    global.__tempServer = server;
  });
}

// 关闭HTTP服务器
async function closeServer(): Promise<void> {
  const server = global.__tempServer;
  if (server) {
    return new Promise((resolve) => {
      server.close(() => {
        global.__tempServer = undefined;
        resolve();
      });
    });
  }
}

export async function POST(req: Request) {
  const port = 3456; // 使用一个固定的端口
  
  try {
    const { contents, format, title, author = 'WePub' } = (await req.json()) as ExportRequest;
    
    // 创建临时目录
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wepub-'));
    const outputPath = path.join(tempDir, `output.${format}`);
    
    try {
      // 准备HTML内容
      const fullHtml = prepareFullHtml(contents);
      
      // 启动临时HTTP服务器
      await serveHtmlContent(fullHtml, port);
      
      // 构建 percollate 命令，使用 http://localhost:{port} 作为源
      const command = `npx percollate ${format} --output "${outputPath}" --title "${title}" --author "${author}" "http://localhost:${port}"`;
      
      // 执行命令
      const { stdout, stderr } = await execAsync(command);
      console.log('Percollate 输出:', stdout);
      if (stderr) {
        console.error('Percollate 错误:', stderr);
      }
      
      // 读取生成的文件
      const file = await fs.readFile(outputPath);
      
      // 设置正确的 Content-Type
      const contentTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'epub': 'application/epub+zip',
        'html': 'text/html',
        'md': 'text/markdown'
      };
      
      // 对文件名进行编码
      const encodedTitle = encodeURIComponent(title);
      
      // 返回文件
      return new Response(file, {
        headers: {
          'Content-Type': contentTypes[format] || 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodedTitle}.${format}`,
        },
      });
    } finally {
      // 关闭服务器
      await closeServer();
      // 清理临时文件
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    // 确保服务器被关闭
    await closeServer();
    
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