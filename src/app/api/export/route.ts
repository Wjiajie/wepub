import { NextRequest, NextResponse } from 'next/server';
import { ExportFactory } from '@/services/export.factory';
import { ExportError } from '@/core/errors/export.error';
import { unlink } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const { contents, title, format, author, description, coverImage } = await request.json();

    // 验证必要参数
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json(
        { error: 'No contents provided' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'No title provided' },
        { status: 400 }
      );
    }

    if (!format) {
      return NextResponse.json(
        { error: 'No format provided' },
        { status: 400 }
      );
    }

    // 获取对应格式的转换器，使用静态方法
    const converter = ExportFactory.createConverter(format);
    
    // 设置输出文件路径
    const outputPath = `${title}.${format}`;
    
    // 转换内容
    const result = await converter.convert(
      { 
        title, 
        author, 
        description, 
        coverImage,
        contents 
      }, 
      { outputPath }
    );
    
    // 删除生成的文件
    try {
      await unlink(outputPath);
    } catch (error) {
      console.warn(`无法删除临时文件 ${outputPath}:`, error);
    }
    
    // 根据格式设置正确的 Content-Type
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      epub: 'application/epub+zip',
      html: 'application/zip',
      md: 'application/zip'
    };
    
    // 设置文件名
    const fileName = `${title}.${format === 'html' || format === 'md' ? 'zip' : format}`;
    
    // 返回结果
    return new NextResponse(result, {
      headers: {
        'Content-Type': contentTypes[format] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    
    if (error instanceof ExportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Export failed', details: (error as Error).message },
      { status: 500 }
    );
  }
} 