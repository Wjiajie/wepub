import { Article, Content } from '@/core/interfaces/content.interface';
import { coverStyles, articleStyles, tocStyles } from '@/styles';

export class TemplateService {
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
        <div class="source-link">
          <p>原文链接：<a href="${article.url}" target="_blank">${article.url}</a></p>
        </div>
        ${this.prepareNavigation(contents, index, timestamp)}
      </body>
      </html>`;
  }

  generateCoverHtml(content: Content): string {
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
          <h1>${content.title}</h1>
          ${content.author ? `<div class="author">${content.author}</div>` : ''}
          <div class="divider"></div>
          <div class="meta-info">
            ${content.description ? `<p>${content.description}</p>` : ''}
            <p class="stats">收录文章：${content.contents.length} 篇</p>
            <p class="stats">导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
          </div>
        </div>
      </body>
      </html>`;
  }

  generateTocHtml(content: Content, timestamp: number): string {
    const toc = content.contents.map((article, index) => 
      `<li>
        <a href="${timestamp}_article_${index}.html">${article.title}</a>
        <div class="article-url">${article.url}</div>
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
        <h1>${content.title}</h1>
        
        <div class="meta-info">
          ${content.author ? `<p class="author">作者：${content.author}</p>` : ''}
          ${content.description ? `<p class="description">${content.description}</p>` : ''}
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