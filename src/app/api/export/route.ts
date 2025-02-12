import { NextResponse } from 'next/server';
import epubGen from 'epub-gen-memory';
import { JSDOM } from 'jsdom';
import katex from 'katex';

interface Article {
  title: string;
  content: string;
  byline?: string;
  excerpt?: string;
}

interface ExportRequest {
  title: string;
  articles: {
    url: string;
    article: Article;
  }[];
}

// 公式处理策略接口
interface FormulaStrategy {
  detect(element: Element | string): boolean;
  convert(element: Element | string, displayMode: boolean): string;
}

// KaTeX 公式处理策略
class KaTeXStrategy implements FormulaStrategy {
  detect(element: Element | string): boolean {
    if (typeof element === 'string') return false;
    const isKatex = element.classList.contains('katex') || element.classList.contains('katex-display');
    if (isKatex) {
      // console.log('\n[KaTeX 检测] 发现 KaTeX 公式:');
      // console.log('- 元素类名:', element.className);
      // console.log('- 元素内容:', element.outerHTML.slice(0, 200) + '...');
    }
    return isKatex;
  }

  convert(element: Element, displayMode: boolean): string {
    try {
      // console.log('\n[KaTeX 转换] 开始处理:');
      // console.log('- 显示模式:', displayMode ? '块级' : '行内');

      // 提取所有 SVG 元素
      const svgElements = element.querySelectorAll('svg');
      // console.log('- 找到 SVG 元素数量:', svgElements.length);

      if (svgElements.length === 0) {
        throw new Error('未找到 SVG 元素');
      }

      // 提取 KaTeX 生成的样式
      const styleElement = element.querySelector('style');
      const katexStyles = styleElement ? styleElement.textContent : '';
      // console.log('- 是否包含样式:', styleElement ? '是' : '否');

      // 处理每个 SVG 元素
      let combinedSvg = '';
      svgElements.forEach((svgElement) => {
        // 获取 SVG 的尺寸
        const width = svgElement.getAttribute('width');
        const height = svgElement.getAttribute('height');
        
        // 设置 viewBox 以确保 SVG 正确缩放
        if (!svgElement.hasAttribute('viewBox') && width && height) {
          svgElement.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
        }
        
        // 确保 SVG 具有正确的命名空间
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // 将样式嵌入到 SVG 中
        const existingDefs = svgElement.querySelector('defs') || document.createElement('defs');
        existingDefs.innerHTML += `<style>${katexStyles}</style>`;
        if (!svgElement.querySelector('defs')) {
          svgElement.insertBefore(existingDefs, svgElement.firstChild);
        }

        // 确保所有类名都被保留
        const originalClasses = Array.from(svgElement.classList);
        originalClasses.forEach(className => {
          if (!className.includes('katex')) {
            svgElement.classList.add(className);
          }
        });

        combinedSvg += svgElement.outerHTML;
      });

      // 设置容器样式
      const containerStyle = displayMode
        ? 'display: block; margin: 1em auto; text-align: center;'
        : 'display: inline-block; vertical-align: middle; line-height: 0;';

      // console.log('[公式转换] 成功转换为 SVG');
      
      // 返回包含所有 SVG 的容器
      return displayMode
        ? `<div class="math-block" style="${containerStyle}">${combinedSvg}</div>`
        : `<span class="math-inline" style="${containerStyle}">${combinedSvg}</span>`;

    } catch (error) {
      if (error instanceof Error) {
      }
      // console.error('[KaTeX 转换] 错误:', error); 
      return element.outerHTML;
    }
  }
}

// MathJax 公式处理策略
class MathJaxStrategy implements FormulaStrategy {
  detect(element: Element | string): boolean {
    if (typeof element === 'string') return false;
    const isMathML = element.tagName.toLowerCase() === 'math' ||
                     element.querySelector('math') !== null;
    if (isMathML) {
      console.log('\n[MathML 检测] 发现 MathML 公式:');
      console.log('- 元素标签:', element.tagName);
      console.log('- 原始内容:', element.outerHTML);
    }
    return isMathML;
  }

  convert(element: Element, displayMode: boolean): string {
    try {
      console.log('\n[MathML 转换] 开始处理:');
      
      // 1. 获取math元素
      const mathElement = element.tagName.toLowerCase() === 'math' ? 
        element : element.querySelector('math');
      
      if (!mathElement) {
        throw new Error('未找到math元素');
      }

      // 2. 获取显示模式
      const isDisplayBlock = mathElement.getAttribute('display') === 'block' || displayMode;
      
      // 3. 首选尝试获取LaTeX注解
      const annotation = mathElement.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation && annotation.textContent) {
        const latex = annotation.textContent.trim();
        console.log('- 从注解提取的LaTeX:', latex);
        
        // 处理特殊字符和命令
        const processedLatex = latex
          // 保持原始的粗体命令
          .replace(/\\boldsymbol{([^}]+)}/g, '\\boldsymbol{$1}')
          // 保持原始的黑板粗体
          .replace(/\\mathbb{([^}]+)}/g, '\\mathbb{$1}')
          // 正确处理转置符号
          .replace(/\\top/g, '\\top')
          // 处理乘号
          .replace(/\\times/g, '\\times')
          // 处理属于符号
          .replace(/\\in/g, '\\in')
          // 移除equation环境但保持编号
          .replace(/\\begin{equation}\s*/, '')
          .replace(/\\end{equation}\s*/, '')
          // 确保分数和根号周围有足够的空间
          .replace(/\\frac{([^}]+)}{\\sqrt{([^}]+)}}/g, '\\dfrac{$1}{\\sqrt{$2}}')
          // 处理矩阵转置
          .replace(/\^{\\mathsf{T}}/g, '^{\\top}')
          .replace(/\^T/g, '^{\\top}')
          .trim();
        
        console.log('- 处理后的LaTeX:', processedLatex);
        
        // 使用KaTeX渲染
        const katexOptions: katex.KatexOptions = {
          displayMode: isDisplayBlock,
          output: 'html',
          throwOnError: false,
          errorColor: '#cc0000',
          trust: true,
          maxSize: 1000,
          maxExpand: 1000,
          macros: {
            '\\top': '^{\\mathsf{T}}',
            '\\boldsymbol': '\\mathbf', // 如果KaTeX不支持boldsymbol，使用mathbf作为后备
          },
          strict: (function() {
            try {
              // 尝试使用更严格的解析
              katex.renderToString(processedLatex, {strict: true});
              return true;
            } catch {  // 直接使用空的 catch 块
              return false;
            }
          })()
        };

        const html = katex.renderToString(processedLatex, katexOptions);
        const tempDom = new JSDOM(`<!DOCTYPE html><div>${html}</div>`);
        const katexElement = tempDom.window.document.querySelector('.katex');
        
        if (katexElement) {
          return new KaTeXStrategy().convert(katexElement, isDisplayBlock);
        }
      }

      // 4. 如果没有LaTeX注解，保持原始MathML
      console.log('- 无法从注解提取LaTeX，保留原始MathML');
      return mathElement.outerHTML;

    } catch (error) {
      console.error('[MathML 转换] 错误:', error);
      return element.outerHTML;
    }
  }
}

// LaTeX 文本处理策略
class LaTeXStrategy implements FormulaStrategy {
  detect(element: Element | string): boolean {
    if (typeof element === 'string') {
      const isLatex = /^\$\$[\s\S]+\$\$$/.test(element) || /^\$[^$\n]+\$$/.test(element);
      if (isLatex) {
        console.log('\n[LaTeX 检测] 发现原始 LaTeX 公式:');
        console.log('- 公式内容:', element);
      }
      return isLatex;
    }
    return false;
  }

  convert(element: string | Element, displayMode: boolean): string {
    try {
      console.log('\n[LaTeX 转换] 开始处理:');
      console.log('- 显示模式:', displayMode ? '块级' : '行内');

      const tex = typeof element === 'string'
        ? element.replace(/^\$\$|\$\$$|^\$|\$$/g, '').trim()
        : '';
      
      console.log('- 提取的 LaTeX:', tex);

      const katexOptions: katex.KatexOptions = {
        displayMode,
        output: 'html',
        throwOnError: false,
        errorColor: '#cc0000',
        trust: true,
        strict: false,
        maxSize: 1000,
        maxExpand: 1000
      };

      const html = katex.renderToString(tex, katexOptions);
      const tempDom = new JSDOM(`<!DOCTYPE html><div>${html}</div>`);
      const katexElement = tempDom.window.document.querySelector('.katex');
      
      if (katexElement) {
        return new KaTeXStrategy().convert(katexElement, displayMode);
      }

      throw new Error('LaTeX 渲染失败');
    } catch (error) {
      console.error('[LaTeX 转换] 错误:', error);
      return `<span class="math-error" style="color: #cc0000;">${element}</span>`;
    }
  }
}

// 公式处理器类
class FormulaProcessor {
  private strategies: FormulaStrategy[];

  constructor() {
    this.strategies = [
      new KaTeXStrategy(),
      new MathJaxStrategy(),
      new LaTeXStrategy()
    ];
  }

  processFormula(element: Element | string, displayMode: boolean = false): string {
    // console.log('\n[公式处理] 开始处理新公式:');
    // console.log('- 输入类型:', typeof element === 'string' ? '文本' : 'DOM元素');
    if (typeof element === 'string') {
      // console.log('- 输入内容:', element);
    } else {
      // console.log('- 元素标签:', element.tagName);
      // console.log('- 元素类名:', element.className);
      // console.log('- 元素内容:', element.outerHTML.slice(0, 200) + '...');
    }

    for (const strategy of this.strategies) {
      if (strategy.detect(element)) {
        // console.log('- 使用策略:', strategy.constructor.name);
        return strategy.convert(element, displayMode);
      }
    }

    // console.log('- 未找到匹配的处理策略，保留原始内容');
    return typeof element === 'string' ? element : element.outerHTML;
  }
}

// 处理文章内容中的图片、代码块和数学公式
async function processContent(content: string): Promise<string> {
  // console.log('\n[内容处理] 开始处理文章内容');
  // console.log('- 原始内容片段:', content.slice(0, 200) + '...');

  const dom = new JSDOM(`<!DOCTYPE html><body>${content}</body>`);
  const document = dom.window.document;
  const formulaProcessor = new FormulaProcessor();

  // 处理代码块
  // 1. 处理 pre + code 组合的代码块
  const preCodeBlocks = document.querySelectorAll('pre > code, pre code');
  for (const codeElement of Array.from(preCodeBlocks)) {
    const preElement = codeElement.closest('pre');
    if (!preElement) continue;

    // 提取代码内容
    const codeContent = codeElement.innerHTML
      .replace(/<\/?span[^>]*>/g, '') // 移除所有span标签
      .replace(/<br\s*\/?>/g, '\n') // 将<br>转换为换行符
      .replace(/&lt;/g, '<') // 转换HTML实体
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    // 处理缩进和格式化
    const formattedCode = codeContent
      .split('\n')
      .map(line => {
        // 保留原始缩进（使用空格）
        const indentMatch = line.match(/^[\s\t]*/);
        const indent = indentMatch ? indentMatch[0] : '';
        const indentSpaces = indent.replace(/\t/g, '    '); // 将tab转换为4个空格
        return indentSpaces + line.trim();
      })
      .join('\n');

    // 获取代码语言
    let language = '';
    // 尝试从 code 标签的 class 获取语言
    const codeClass = codeElement.className || '';
    const codeLanguageMatch = codeClass.match(/(?:language|lang)-(\w+)/);
    if (codeLanguageMatch) {
      language = codeLanguageMatch[1];
    } else {
      // 尝试从 pre 标签的 class 获取语言
      const preClass = preElement.className || '';
      const preLanguageMatch = preClass.match(/(?:language|lang)-(\w+)/);
      if (preLanguageMatch) {
        language = preLanguageMatch[1];
      }
    }

    // 创建新的代码块结构
    const newPre = document.createElement('pre');
    newPre.className = 'code-block' + (language ? ` language-${language}` : '');
    
    const newCode = document.createElement('code');
    newCode.className = language ? `language-${language}` : '';
    newCode.textContent = formattedCode;
    
    // 添加行号
    const lines = formattedCode.split('\n');
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';
    lineNumbers.innerHTML = lines.map((_, i) => `<span class="line-number">${i + 1}</span>`).join('');
    
    const codeWrapper = document.createElement('div');
    codeWrapper.className = 'code-wrapper';
    codeWrapper.appendChild(lineNumbers);
    codeWrapper.appendChild(newCode);
    
    newPre.appendChild(codeWrapper);
    if (preElement.parentNode) {
      preElement.parentNode.replaceChild(newPre, preElement);
    }
  }

  // 2. 处理其他可能的代码块格式（比如只有pre标签但包含代码的情况）
  const remainingPreElements = document.querySelectorAll('pre:not(.code-block)');
  for (const pre of Array.from(remainingPreElements)) {
    // 检查是否看起来像代码块
    const content = pre.innerHTML;
    const isCodeBlock = (
      // 检查是否包含编程相关的关键字
      /\b(?:function|class|var|let|const|if|else|for|while|return|import|export)\b/.test(content) ||
      // 检查是否包含常见的代码符号
      /[{}\[\]()=><+\-*/%]/.test(content) ||
      // 检查是否有代码相关的类名
      pre.className.includes('code') ||
      pre.className.includes('syntax') ||
      // 检查是否有代码相关的属性
      pre.hasAttribute('data-language') ||
      pre.hasAttribute('data-lang')
    );

    if (isCodeBlock) {
      // 提取代码内容
      const codeContent = pre.innerHTML
        .replace(/<\/?span[^>]*>/g, '')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      // 处理缩进和格式化
      const formattedCode = codeContent
        .split('\n')
        .map(line => {
          // 保留原始缩进（使用空格）
          const indentMatch = line.match(/^[\s\t]*/);
          const indent = indentMatch ? indentMatch[0] : '';
          const indentSpaces = indent.replace(/\t/g, '    '); // 将tab转换为4个空格
          return indentSpaces + line.trim();
        })
        .join('\n');

      // 尝试识别语言
      let language = '';
      // 从 data 属性中获取
      language = pre.getAttribute('data-language') || 
                pre.getAttribute('data-lang') || 
                '';
      
      // 如果没有从 data 属性获取到，尝试从类名中获取
      if (!language) {
        const languageMatch = pre.className.match(/(?:language|lang)-(\w+)/);
        if (languageMatch) {
          language = languageMatch[1];
        }
      }

      // 创建新的代码块结构
      const newPre = document.createElement('pre');
      newPre.className = 'code-block' + (language ? ` language-${language}` : '');
      
      const newCode = document.createElement('code');
      newCode.className = language ? `language-${language}` : '';
      newCode.textContent = formattedCode;
      
      newPre.appendChild(newCode);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(newPre, pre);
      }
    }
  }

  // 处理 MathML 公式
  // console.log('\n[内容处理] 查找 MathML 公式');
  const mathElements = document.querySelectorAll('math');
  // console.log('- 找到 MathML 公式数量:', mathElements.length);

  mathElements.forEach((element) => {
    // console.log(`\n[内容处理] 处理第 ${index + 1} 个 MathML 公式:`);
    const svgContent = formulaProcessor.processFormula(
      element,
      element.getAttribute('display') === 'block'
    );
    const temp = document.createElement('div');
    temp.innerHTML = svgContent;
    element.parentNode?.replaceChild(temp.firstChild!, element);
  });

  // 处理已渲染的数学公式
  // console.log('\n[内容处理] 查找已渲染的公式');
  const renderedFormulas = document.querySelectorAll('.katex, .katex-display, .MathJax, .MathJax_Display');
  // console.log('- 找到已渲染公式数量:', renderedFormulas.length);

  renderedFormulas.forEach((element) => {
    // console.log(`\n[内容处理] 处理第 ${index + 1} 个已渲染公式:`);
    // console.log('- 元素类名:', element.className);
    const svgContent = formulaProcessor.processFormula(
      element, 
      element.classList.contains('katex-display') || element.classList.contains('MathJax_Display')
    );
    const temp = document.createElement('div');
    temp.innerHTML = svgContent;
    element.parentNode?.replaceChild(temp.firstChild!, element);
  });

  // 处理原始 LaTeX 文本
  // console.log('\n[内容处理] 查找原始 LaTeX 公式');
  const text = document.body.innerHTML;
  
  // 处理块级公式
  let processedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
    // console.log('\n[内容处理] 发现块级 LaTeX 公式:', match);
    return formulaProcessor.processFormula(match, true);
  });

  // 处理行内公式
  processedText = processedText.replace(/\$([^$\n]+?)\$/g, (match) => {
    // console.log('\n[内容处理] 发现行内 LaTeX 公式:', match);
    return formulaProcessor.processFormula(match, false);
  });

  // 更新 DOM 内容
  document.body.innerHTML = processedText;

  // 清理 HTML，但保留数学公式的 HTML 结构
  const cleanHtml = document.body.innerHTML
    .replace(/&nbsp;/g, ' ')  // 替换 &nbsp; 为普通空格
    .replace(/\u00A0/g, ' ')  // 替换 non-breaking space 为普通空格
    .replace(/>\s+</g, '><')  // 移除标签之间的多余空白
    .replace(/\s{2,}/g, ' '); // 合并多个空格为一个

  return cleanHtml;
}

export async function POST(req: Request) {
  try {
    const { title, articles }: ExportRequest = await req.json();

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: '没有选择要导出的文章' },
        { status: 400 }
      );
    }

    console.log('\n[导出处理] 开始导出电子书');
    console.log('- 电子书标题:', title);
    console.log('- 文章数量:', articles.length);

    // 输出每篇文章的详细信息
    articles.forEach((article, index) => {
      console.log(`\n[导出处理] 文章 ${index + 1}:`);
      console.log('- 标题:', article.article.title);
      console.log('- URL:', article.url);
      if (article.article.byline) {
        console.log('- 作者:', article.article.byline);
      }
      console.log('- 内容预览:');
      console.log('----------------------------------------');
      console.log(article.article.content);
      console.log('----------------------------------------');
    });

    // 处理所有文章内容
    const chapters = await Promise.all(
      articles.map(async ({ article, url }, index) => {
        console.log(`\n[内容处理] 开始处理第 ${index + 1} 篇文章:`, article.title);
        const processedContent = await processContent(article.content);
        console.log(`[内容处理] 第 ${index + 1} 篇文章处理完成`);
        return {
          title: article.title,
          content: `${processedContent}
            <p class="source-url">原文链接：<a href="${url}">${url}</a></p>`,
          beforeChapter: '<div class="chapter">',
          afterChapter: '</div>'
        };
      })
    );

    console.log('所有文章处理完成，开始生成电子书');

    // 电子书配置选项
    const options = {
      title,
      author: 'WePub',
      publisher: 'WePub',
      description: '由 WePub 生成的电子书',
      version: 3,
      date: new Date().toISOString().split('T')[0],
      lang: 'zh-CN',
      tocTitle: '目录',
      appendChapterTitles: true,
      customOpfTemplatePath: null,
      customNcxTocTemplatePath: null,
      customHtmlTocTemplatePath: null,
      css: `
        body {
          font-family: "Microsoft YaHei", Arial, sans-serif;
          line-height: 1.6;
          padding: 20px;
          color: #333;
          margin: 5% auto;
          max-width: 800px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
          margin-top: 30px;
          text-align: center;
        }
        h2 {
          color: #34495e;
          margin-top: 25px;
        }
        h3 {
          color: #7f8c8d;
        }
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1em auto;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .source-url {
          font-size: 0.8em;
          color: #666;
          margin: 2em 0;
          padding-top: 1em;
          border-top: 1px solid #eee;
        }
        blockquote {
          border-left: 4px solid #3498db;
          margin: 20px 0;
          padding: 10px 20px;
          background: #f8f9fa;
          color: #444;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border: 1px solid #ddd;
        }
        th {
          background: #f5f6fa;
          color: #2c3e50;
        }
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        .code-block {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1em 0;
          margin: 1.5em 0;
          overflow-x: auto;
          border: 1px solid #e1e4e8;
          position: relative;
          font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 0.9em;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          tab-size: 4;
        }
        .code-wrapper {
          display: flex;
          position: relative;
        }
        .line-numbers {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: 0 1em;
          margin-right: 1em;
          border-right: 1px solid #e1e4e8;
          background-color: #f1f2f3;
          user-select: none;
          color: #6e7681;
        }
        .line-number {
          font-size: 0.85em;
          line-height: 1.6;
          min-width: 2em;
          text-align: right;
        }
        code {
          flex: 1;
          padding: 0 1em 0 0;
          margin: 0;
          overflow-x: auto;
          font-family: inherit;
          white-space: pre;
          background: none;
          border: none;
        }
        /* Python 语法高亮 */
        .language-python .keyword { color: #cf222e; }
        .language-python .function { color: #8250df; }
        .language-python .class-name { color: #953800; }
        .language-python .string { color: #0a3069; }
        .language-python .number { color: #0550ae; }
        .language-python .comment { color: #6e7781; font-style: italic; }
        .language-python .operator { color: #0550ae; }
        .language-python .punctuation { color: #24292f; }
        .language-python .decorator { color: #116329; }
        .language-python .builtin { color: #0550ae; }
        /* JavaScript/TypeScript 语法高亮 */
        .language-javascript .keyword,
        .language-typescript .keyword { color: #cf222e; }
        .language-javascript .function,
        .language-typescript .function { color: #8250df; }
        .language-javascript .class-name,
        .language-typescript .class-name { color: #953800; }
        .language-javascript .string,
        .language-typescript .string { color: #0a3069; }
        .language-javascript .number,
        .language-typescript .number { color: #0550ae; }
        .language-javascript .comment,
        .language-typescript .comment { color: #6e7781; font-style: italic; }
        .language-javascript .operator,
        .language-typescript .operator { color: #0550ae; }
        .language-javascript .punctuation,
        .language-typescript .punctuation { color: #24292f; }
        /* 适配深色主题 */
        @media (prefers-color-scheme: dark) {
          .code-block {
            background-color: #1f2937;
            border-color: #374151;
          }
          .line-numbers {
            background-color: #1a1f29;
            border-right-color: #374151;
            color: #8b949e;
          }
          code { color: #e5e7eb; }
          /* Python 深色主题 */
          .language-python .keyword { color: #ff7b72; }
          .language-python .function { color: #d2a8ff; }
          .language-python .class-name { color: #ffa657; }
          .language-python .string { color: #a5d6ff; }
          .language-python .number { color: #79c0ff; }
          .language-python .comment { color: #8b949e; }
          .language-python .operator { color: #79c0ff; }
          .language-python .punctuation { color: #c9d1d9; }
          .language-python .decorator { color: #7ee787; }
          .language-python .builtin { color: #79c0ff; }
          /* JavaScript/TypeScript 深色主题 */
          .language-javascript .keyword,
          .language-typescript .keyword { color: #ff7b72; }
          .language-javascript .function,
          .language-typescript .function { color: #d2a8ff; }
          .language-javascript .class-name,
          .language-typescript .class-name { color: #ffa657; }
          .language-javascript .string,
          .language-typescript .string { color: #a5d6ff; }
          .language-javascript .number,
          .language-typescript .number { color: #79c0ff; }
          .language-javascript .comment,
          .language-typescript .comment { color: #8b949e; }
          .language-javascript .operator,
          .language-typescript .operator { color: #79c0ff; }
          .language-javascript .punctuation,
          .language-typescript .punctuation { color: #c9d1d9; }
        }
        .math-block {
          margin: 2em 0;
          text-align: center;
          overflow-x: auto;
          padding: 0.5em 0;
          font-size: 1.1em;
          -webkit-overflow-scrolling: touch;
        }
        .math-inline {
          display: inline-block;
          vertical-align: middle;
          font-size: 1em;
          margin: 0 0.2em;
        }
        .katex {
          font-size: 1.21em !important;
          font-family: KaTeX_Main, "Times New Roman", serif !important;
          text-rendering: auto;
          text-align: center;
          max-width: 100%;
          line-height: 1.4;
          white-space: nowrap !important;
        }
        .katex-display {
          display: block;
          margin: 1em 0;
          text-align: center;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.5em 0;
        }
        .katex-display > .katex {
          display: inline-block;
          text-align: center;
          max-width: 100%;
        }
        .katex-html {
          overflow-x: auto;
          overflow-y: hidden;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        .math-error {
          color: #cc0000;
          border-bottom: 1px dashed #cc0000;
          cursor: help;
          padding: 0 0.2em;
          background-color: #fff0f0;
        }
        .error-details {
          display: none;
          position: absolute;
          background: #fff;
          border: 1px solid #cc0000;
          padding: 0.5em;
          margin-top: 0.5em;
          max-width: 100%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
          font-size: 0.9em;
        }
        .math-error:hover .error-details {
          display: block;
        }
        @font-face {
          font-family: 'KaTeX_Main';
          src: local('KaTeX_Main'), url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Regular.woff2') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @media screen and (max-width: 768px) {
          .math-block {
            font-size: 1em;
            margin: 1.5em 0;
          }
          .katex {
            font-size: 1em !important;
          }
        }
      `
    };

    console.log('开始生成 EPUB 文件');
    const epubData = await epubGen(options, chapters);
    console.log('EPUB 文件生成完成，大小:', epubData.length, '字节');

    return new Response(epubData, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.epub"`,
      },
    });

  } catch (error) {
    console.error('导出 EPUB 失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出 EPUB 失败' },
      { status: 500 }
    );
  }
} 