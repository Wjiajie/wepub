import JSZip from 'jszip';
import { Content } from '@/core/interfaces/content.interface';
import { ConvertOptions } from '@/core/interfaces/converter.interface';
import { BaseConverter } from './base.converter';
import { ExportErrorCode } from '@/core/errors/export.error';

export class HTMLConverter extends BaseConverter {
  async convert(content: Content, {}: ConvertOptions = {}): Promise<Buffer> {
    try {
      const timestamp = Date.now();
      const zip = new JSZip();
      
      // 添加目录页
      zip.file('index.html', this.templateService.generateTocHtml(content, timestamp));
      
      // 添加文章页面
      content.contents.forEach((article, index) => {
        zip.file(
          `${timestamp}_article_${index}.html`,
          this.templateService.generateArticleHtml(article, content.contents, index, timestamp)
        );
      });
      
      // 生成ZIP文件
      return zip.generateAsync({type: 'nodebuffer'});
    } catch (error) {
      return this.handleError(error, ExportErrorCode.CONVERSION_FAILED, 'HTML转换失败');
    }
  }
}