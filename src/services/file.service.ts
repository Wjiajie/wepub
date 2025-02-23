import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { FileSystem } from '@/core/interfaces/converter.interface';

export class FileSystemService implements FileSystem {
  async writeFile(path: string, content: string): Promise<void> {
    await writeFile(path, content);
  }

  async readFile(path: string): Promise<Buffer> {
    return readFile(path);
  }

  async createTempDir(prefix: string): Promise<string> {
    const tempDir = join('/tmp', `${prefix}-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  async cleanup(dir: string): Promise<void> {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.error('清理临时文件夹失败:', error);
    }
  }
} 