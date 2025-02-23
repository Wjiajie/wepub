import { Content } from './content.interface';

export interface ConvertOptions {
  outputPath?: string;
}

export interface FormatConverter {
  convert(content: Content, options?: ConvertOptions): Promise<Buffer>;
}

export interface FileSystem {
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  createTempDir(prefix: string): Promise<string>;
  cleanup(path: string): Promise<void>;
} 