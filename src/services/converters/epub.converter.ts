import { ExportError, ExportErrorCode } from '@/core/errors/export.error';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Content } from '@/core/interfaces/content.interface';
import { ConvertOptions } from '@/core/interfaces/converter.interface';
import { BaseConverter } from './base.converter';

const execAsync = promisify(exec);

export class EPUBConverter extends BaseConverter {
  // 清理标题中的特殊字符
  private sanitizeTitle(title: string): string {
    // 替换括号、引号和其他可能导致问题的特殊字符
    return title
      .replace(/[()[\]{}'"]/g, '') // 移除所有括号和引号
      .replace(/[&]/g, '和') // 替换&为"和"
      .replace(/[<>]/g, '') // 移除尖括号
      .replace(/[\\/:*?".|#%]/g, '-') // 替换其他特殊字符为连字符
      .trim(); // 移除首尾空格
  }

  // 从Markdown文本中提取纯文本
  private stripMarkdown(text: string): string {
    if (!text) return '';
    // 移除Markdown链接，保留链接文本
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 移除Markdown图片
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    // 移除Markdown强调符号
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    // 移除Markdown代码块
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    // 移除Markdown标题符号
    text = text.replace(/^#+\s+/gm, '');
    // 移除Markdown列表符号
    text = text.replace(/^[*-]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    
    return text.trim();
  }

  // 清理内容对象中的标题
  private sanitizeContent(content: Content): Content {
    // 创建一个深拷贝以避免修改原始对象
    const sanitizedContent: Content = {
      ...content,
      title: this.sanitizeTitle(content.title),
      contents: content.contents.map(article => ({
        ...article,
        title: this.sanitizeTitle(article.title)
      }))
    };
    return sanitizedContent;
  }

  // 生成目录HTML文件
  private async generateTocHtml(content: Content, tempDir: string): Promise<string> {
    const tocFile = join(tempDir, 'toc.html');
    
    // 渲染Markdown格式的标题、作者和描述
    const renderedTitle = this.templateService.renderMarkdown(content.title);
    const renderedAuthor = content.author ? this.templateService.renderMarkdown(content.author) : '';
    const renderedDescription = content.description ? this.templateService.renderMarkdown(content.description) : '';
    
    const tocHtml = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${content.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <h1>${renderedTitle}</h1>
        ${content.author ? `<p>作者：${renderedAuthor}</p>` : ''}
        ${content.description ? `<div>${renderedDescription}</div>` : ''}
        <p>共收录 ${content.contents.length} 篇文章</p>
        <ul>
          ${content.contents.map((article, index) => 
            `<li><a href="article_${index}.html">${article.title}</a></li>`
          ).join('\n')}
        </ul>
      </body>
      </html>`;
    
    await this.fileSystem.writeFile(tocFile, tocHtml);
    return tocFile;
  }

  async convert(content: Content, options?: ConvertOptions): Promise<Buffer> {
    if (!options?.outputPath) {
      throw new ExportError(
        ExportErrorCode.INVALID_FORMAT,
        'EPUB转换需要指定输出路径'
      );
    }

    // 清理内容中的标题
    const sanitizedContent = this.sanitizeContent(content);
    
    const tempDir = await this.fileSystem.createTempDir('wepub-epub');
    
    try {
      // 生成目录文件
      const tocFile = await this.generateTocHtml(sanitizedContent, tempDir);
      
      // 为每篇文章创建HTML文件
      const articleFiles = [];
      const failedArticles = [];
      
      for (let index = 0; index < sanitizedContent.contents.length; index++) {
        try {
          const article = sanitizedContent.contents[index];
          const articleFile = join(tempDir, `article_${index}.html`);
          await this.fileSystem.writeFile(
            articleFile,
            this.templateService.generateArticleHtml(article, sanitizedContent.contents, index, Date.now())
          );
          articleFiles.push(articleFile);
        } catch (error) {
          console.warn(`文章 "${sanitizedContent.contents[index].title}" 处理失败，将被跳过`, error);
          failedArticles.push(sanitizedContent.contents[index].title);
        }
      }
      
      if (articleFiles.length === 0) {
        throw new ExportError(
          ExportErrorCode.CONVERSION_FAILED,
          '所有文章处理失败，无法生成EPUB'
        );
      }
      
      // 合并所有文件路径，使用目录文件作为第一个文件
      const htmlFiles = [tocFile, ...articleFiles];
      
      // 使用 percollate 转换为 EPUB，对命令行参数进行转义
      const safeOutputPath = options.outputPath.replace(/(["\s'()&;])/g, '\\$1');
      const safeAuthor = sanitizedContent.author ? this.stripMarkdown(sanitizedContent.author).replace(/(["\s'()&;])/g, '\\$1') : '';
      
      // 构建安全的文件路径字符串
      const safeHtmlFiles = htmlFiles.map(file => `"${file.replace(/(["\s'()&;])/g, '\\$1')}"`).join(' ');
      
      // 只使用 --title 和 --cover 参数，让 percollate 自动生成封面
      const cmd = `percollate epub --output "${safeOutputPath}" ${
        sanitizedContent.author ? `--author "${safeAuthor}"` : ''
      } --title "${this.stripMarkdown(sanitizedContent.title).replace(/(["\s'()&;])/g, '\\$1')}" --cover ${safeHtmlFiles}`;
      
      try {
        await execAsync(cmd);
        
        // 如果有失败的文章，记录警告信息
        if (failedArticles.length > 0) {
          console.warn(`EPUB生成完成，但以下文章被跳过: ${failedArticles.join(', ')}`);
        }
      } catch (error) {
        if (failedArticles.length > 0) {
          console.error(`Percollate处理失败，以下文章被跳过: ${failedArticles.join(', ')}`, error);
        }
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