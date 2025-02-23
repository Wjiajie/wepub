import { ExportError, ExportErrorCode } from '@/core/errors/export.error';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Content } from '@/core/interfaces/content.interface';
import { ConvertOptions } from '@/core/interfaces/converter.interface';
import { BaseConverter } from './base.converter';

const execAsync = promisify(exec);

export class EPUBConverter extends BaseConverter {
  async convert(content: Content, options?: ConvertOptions): Promise<Buffer> {
    if (!options?.outputPath) {
      throw new ExportError(
        ExportErrorCode.INVALID_FORMAT,
        'EPUB转换需要指定输出路径'
      );
    }

    const tempDir = await this.fileSystem.createTempDir('wepub-epub');
    
    try {
      // 写入封面文件
      const coverFile = join(tempDir, 'input.html');
      await this.fileSystem.writeFile(coverFile, this.templateService.generateCoverHtml(content));
      
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
      const htmlFiles = [coverFile, ...articleFiles];
      
      // 使用 percollate 转换为 EPUB
      const cmd = `percollate epub --output "${options.outputPath}" ${
        content.author ? `--author "${content.author}"` : ''
      } "${htmlFiles.join('" "')}"`;
      
      try {
        await execAsync(cmd);
      } catch (error) {
        return this.handleError(error, ExportErrorCode.PROCESS_ERROR, 'Percollate处理失败');
      }
      
      // 读取生成的文件
      return this.fileSystem.readFile(options.outputPath);
    } catch (error) {
      return this.handleError(error, ExportErrorCode.CONVERSION_FAILED, 'EPUB转换失败');
    } finally {
      await this.fileSystem.cleanup(tempDir);
    }
  }
} 