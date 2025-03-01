export interface Article {
  url: string;
  title: string;
  content: string;
}

export interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
}

export interface RSSFeed {
  title: string;
  description?: string;
  items: RSSItem[];
}

export interface Content {
  contents: Article[];
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
}

export interface ExportOptions {
  format: 'html' | 'pdf' | 'epub' | 'md';
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
} 