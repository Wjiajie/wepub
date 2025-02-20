import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// 支持的导出格式
const SUPPORTED_FORMATS = ['pdf', 'epub', 'html', 'md'] as const;
type ExportFormat = typeof SUPPORTED_FORMATS[number];

interface ExportRequest {
  urls: string[];
  format: ExportFormat;
  title?: string;
  author?: string;
}

// 验证导出格式是否支持
function isValidFormat(format: string): format is ExportFormat {
  return SUPPORTED_FORMATS.includes(format as ExportFormat);
}

// 创建临时目录
async function createTempDir() {
  const tempDir = path.join(os.tmpdir(), `wepub-${uuidv4()}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// 清理临时文件
async function cleanup(tempDir: string, filePath: string) {
  try {
    await fs.unlink(filePath);
    await fs.rmdir(tempDir);
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
}

export async function POST(req: Request) {
  try {
    const { urls, format, title = '导出文档', author = '未知作者' } = await req.json() as ExportRequest;

    // 验证输入
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: '请提供要导出的URL列表' },
        { status: 400 }
      );
    }

    if (!format || !isValidFormat(format)) {
      return NextResponse.json(
        { error: `不支持的导出格式。支持的格式: ${SUPPORTED_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // 创建临时目录
    const tempDir = await createTempDir();
    const outputFileName = `${title.replace(/[^a-zA-Z0-9]/g, '-')}.${format}`;
    const outputPath = path.join(tempDir, outputFileName);

    // 构建 percollate 命令
    let command = `npx percollate ${format}`;
    
    // 添加元数据
    if (format === 'epub' || format === 'pdf') {
      command += ` --title "${title}" --author "${author}"`;
    }
    
    // 添加输出路径和URL列表
    command += ` -o "${outputPath}" ${urls.map(url => `"${url}"`).join(' ')}`;

    // 执行命令
    await execAsync(command);

    // 读取生成的文件
    const fileContent = await fs.readFile(outputPath);
    
    // 设置正确的Content-Type
    const contentTypes = {
      'pdf': 'application/pdf',
      'epub': 'application/epub+zip',
      'html': 'text/html',
      'md': 'text/markdown'
    };

    // 清理临时文件
    cleanup(tempDir, outputPath).catch(console.error);

    // 返回文件
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
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