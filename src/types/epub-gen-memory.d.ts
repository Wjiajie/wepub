declare module 'epub-gen-memory' {
  interface EpubOptions {
    title: string;
    author: string;
    publisher?: string;
    cover?: string;
    content: Array<{
      title: string;
      author?: string;
      data: string;
      beforeToc?: string;
    }>;
    css?: string;
    lang?: string;
    tocTitle?: string;
    appendChapterTitles?: boolean;
    customOpfTemplatePath?: string;
    customNcxTocTemplatePath?: string;
    customHtmlTocTemplatePath?: string;
    version?: number;
  }

  class Epub {
    constructor(options: EpubOptions);
    generateAsync(): Promise<Buffer>;
  }

  export default Epub;
} 