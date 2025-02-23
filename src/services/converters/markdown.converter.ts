import JSZip from 'jszip';
import { Content } from '@/core/interfaces/content.interface';
import { ConvertOptions } from '@/core/interfaces/converter.interface';
import { BaseConverter } from './base.converter';
import { ExportErrorCode } from '@/core/errors/export.error';

export class MarkdownConverter extends BaseConverter {
  async convert(content: Content, {}: ConvertOptions = {}): Promise<Buffer> {
    try {
      const timestamp = Date.now();
      const zip = new JSZip();
      
      // 生成目录文件
      let indexContent = `# ${content.title}\n\n`;
      if (content.author) {
        indexContent += `作者：${content.author}\n\n`;
      }
      if (content.description) {
        indexContent += `${content.description}\n\n`;
      }
      indexContent += `导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
      indexContent += `共收录 ${content.contents.length} 篇文章\n\n`;
      indexContent += `## 目录\n\n`;
      indexContent += content.contents.map((article, index) => 
        `- [${article.title}](${timestamp}_article_${index}.md) - [原文](${article.url})`
      ).join('\n');
      
      zip.file('index.md', indexContent);
      
      // 生成文章文件
      content.contents.forEach((article, index) => {
        const navigation = [];
        if (index > 0) {
          navigation.push(`[上一篇](${timestamp}_article_${index - 1}.md)`);
        }
        navigation.push('[返回目录](index.md)');
        if (index < content.contents.length - 1) {
          navigation.push(`[下一篇](${timestamp}_article_${index + 1}.md)`);
        }

        const articleContent = `# ${article.title}

${navigation.join(' | ')}

---

${article.content}

---

${navigation.join(' | ')}

> 原文链接：[${article.url}](${article.url})
`;
        
        zip.file(`${timestamp}_article_${index}.md`, articleContent);
      });
      
      // 生成ZIP文件
      return zip.generateAsync({type: 'nodebuffer'});
    } catch (error) {
      return this.handleError(error, ExportErrorCode.CONVERSION_FAILED, 'Markdown转换失败');
    }
  }
} 