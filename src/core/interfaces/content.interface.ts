export interface Article {
  url: string;
  title: string;
  content: string;
}

export interface Content {
  contents: Article[];
  title: string;
  author?: string;
  description?: string;
}

export interface ExportOptions {
  format: 'html' | 'pdf' | 'epub' | 'md';
  title: string;
  author?: string;
  description?: string;
} 