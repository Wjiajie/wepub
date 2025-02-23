import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Content } from '@/core/interfaces/content.interface';
import { ConvertOptions } from '@/core/interfaces/converter.interface';
import { BaseConverter } from './base.converter';
import { ExportError, ExportErrorCode } from '@/core/errors/export.error';

const execAsync = promisify(exec);

export class PDFConverter extends BaseConverter {
  async convert(content: Content, options?: ConvertOptions): Promise<Buffer> {
    if (!options?.outputPath) {
      throw new ExportError(
        ExportErrorCode.INVALID_FORMAT,
        'PDF转换需要指定输出路径'
      );
    }

    const tempDir = await this.fileSystem.createTempDir('wepub-pdf');
    
    try {
      // 写入封面文件
      const coverFile = join(tempDir, 'cover.html');
      await this.fileSystem.writeFile(coverFile, this.templateService.generateCoverHtml(content));
      
      // 写入目录文件
      const tocFile = join(tempDir, 'toc.html');
      await this.fileSystem.writeFile(tocFile, this.templateService.generateTocHtml(content, Date.now()));
      
      // 为每篇文章创建HTML文件
      const articleFiles = await Promise.all(content.contents.map(async (article, index) => {
        const articleFile = join(tempDir, `article_${index}.html`);
        await this.fileSystem.writeFile(
          articleFile,
          this.templateService.generateArticleHtml(article, content.contents, index, Date.now())
        );
        return articleFile;
      }));
      
      // 合并所有文件路径
      const htmlFiles = [coverFile, tocFile, ...articleFiles];
      
      // 使用 percollate 转换为 PDF
      const cmd = `percollate pdf --no-toc --no-cover --output "${options.outputPath}" "${htmlFiles.join('" "')}"`;
      
      try {
        await execAsync(cmd);
      } catch (error) {
        return this.handleError(error, ExportErrorCode.PROCESS_ERROR, 'Percollate处理失败');
      }
      
      // 读取生成的文件
      return this.fileSystem.readFile(options.outputPath);
    } catch (error) {
      return this.handleError(error, ExportErrorCode.CONVERSION_FAILED, 'PDF转换失败');
    } finally {
      await this.fileSystem.cleanup(tempDir);
    }
  }
} 