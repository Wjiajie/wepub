import { NextResponse } from 'next/server';
import { join } from 'path';
import { Content, ExportOptions } from '@/core/interfaces/content.interface';
import { ExportFactory } from '@/services/export.factory';
import { ExportError } from '@/core/errors/export.error';

export async function POST(req: Request) {
  try {
    const { contents, title, format = 'html', author, description } = await req.json() as Content & ExportOptions;
    
    const converter = ExportFactory.createConverter(format);
    const options = format === 'html' || format === 'md' 
      ? undefined 
      : { outputPath: join('/tmp', `output.${format}`) };
    
    const result = await converter.convert({ contents, title, author, description }, options);
    
    const contentType = {
      'html': 'application/zip',
      'pdf': 'application/pdf',
      'epub': 'application/epub+zip',
      'md': 'application/zip'
    }[format];
    
    const extension = format === 'html' || format === 'md' ? 'zip' : format;
    
    return new Response(result, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.${extension}`,
      },
    });
  } catch (error) {
    console.error('导出失败:', error);
    
    if (error instanceof ExportError) {
      return NextResponse.json(
        { 
          error: '导出失败',
          code: error.code,
          message: error.message,
          details: error.details
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '导出失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 