import { Article, Content } from '@/core/interfaces/content.interface';
import { coverStyles, articleStyles, tocStyles } from '@/styles';
import MarkdownIt from 'markdown-it';

export class TemplateService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
  }

  // 渲染Markdown内容为HTML
  renderMarkdown(text: string): string {
    if (!text) return '';
    return this.md.render(text);
  }

  prepareNavigation(contents: Article[], currentIndex: number, timestamp: number): string {
    const prev = currentIndex > 0 
      ? `<a href="${timestamp}_article_${currentIndex - 1}.html">上一篇: ${contents[currentIndex - 1].title}</a>` 
      : '';
    const next = currentIndex < contents.length - 1 
      ? `<a href="${timestamp}_article_${currentIndex + 1}.html">下一篇: ${contents[currentIndex + 1].title}</a>` 
      : '';
    const index = `<a href="index.html">返回目录</a>`;

    return `<div class="navigation">
      <div class="prev">${prev}</div>
      <div class="index">${index}</div>
      <div class="next">${next}</div>
    </div>`;
  }

  generateArticleHtml(article: Article, contents: Article[], index: number, timestamp: number): string {
    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${article.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${articleStyles}</style>
      </head>
      <body>
        ${this.prepareNavigation(contents, index, timestamp)}
        <article>
          ${article.content}
        </article>
        ${this.prepareNavigation(contents, index, timestamp)}
      </body>
      </html>`;
  }

  // 从Markdown图片链接中提取URL
  extractImageUrl(mdText: string): string | undefined {
    if (!mdText) return undefined;
    const match = mdText.match(/!\[.*?\]\((.*?)\)/);
    if (match && match[1]) return match[1];
    
    // 尝试匹配没有alt文本的格式 ![]()
    const simpleMatch = mdText.match(/!\[\]\((.*?)\)/);
    if (simpleMatch && simpleMatch[1]) return simpleMatch[1];
    
    return undefined;
  }

  // 获取封面图片URL
  getValidCoverImageUrl(coverImage?: string): string | undefined {
    if (!coverImage) return undefined;
    return this.extractImageUrl(coverImage);
  }

  generateCoverHtml(content: Content): string {
    // 渲染Markdown格式的标题、作者和描述
    const renderedTitle = this.renderMarkdown(content.title);
    const renderedAuthor = content.author ? this.renderMarkdown(content.author) : '';
    const renderedDescription = content.description ? this.renderMarkdown(content.description) : '';
    
    // 获取封面图片URL
    const coverImageUrl = this.getValidCoverImageUrl(content.coverImage);

    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${content.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${content.author ? `<meta name="author" content="${content.author}">` : ''}
        <style>${coverStyles}</style>
      </head>
      <body>
        <div class="cover">
          ${coverImageUrl ? `<div class="cover-image"><img src="${coverImageUrl}" alt="封面图片" /></div>` : ''}
          <div class="title">${renderedTitle}</div>
          ${content.author ? `<div class="author">${renderedAuthor}</div>` : ''}
          <div class="divider"></div>
          <div class="meta-info">
            ${content.description ? `<div class="description">${renderedDescription}</div>` : ''}
            <p class="stats">收录文章：${content.contents.length} 篇</p>
            <p class="stats">导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
          </div>
        </div>
      </body>
      </html>`;
  }

  generateTocHtml(content: Content, timestamp: number): string {
    // 渲染Markdown格式的标题、作者和描述
    const renderedTitle = this.renderMarkdown(content.title);
    const renderedAuthor = content.author ? this.renderMarkdown(content.author) : '';
    const renderedDescription = content.description ? this.renderMarkdown(content.description) : '';
    
    // 获取封面图片URL
    const coverImageUrl = this.getValidCoverImageUrl(content.coverImage);

    const toc = content.contents.map((article, index) => 
      `<li>
        <a href="${timestamp}_article_${index}.html">${article.title}</a>
      </li>`
    ).join('\n');

    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${content.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${tocStyles}</style>
      </head>
      <body>
        ${coverImageUrl ? `<div class="cover-image"><img src="${coverImageUrl}" alt="封面图片" /></div>` : ''}
        <div class="title">${renderedTitle}</div>
        
        <div class="meta-info">
          ${content.author ? `<div class="author">${renderedAuthor}</div>` : ''}
          ${content.description ? `<div class="description">${renderedDescription}</div>` : ''}
          <p>导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
          <p>共收录 ${content.contents.length} 篇文章</p>
        </div>

        <ul class="toc">
          ${toc}
        </ul>
      </body>
      </html>`;
  }
} 