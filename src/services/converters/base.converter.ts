import { FormatConverter, ConvertOptions } from '@/core/interfaces/converter.interface';
import { Content } from '@/core/interfaces/content.interface';
import { FileSystem } from '@/core/interfaces/converter.interface';
import { TemplateService } from '../template.service';
import { ExportError, ExportErrorCode } from '@/core/errors/export.error';

export abstract class BaseConverter implements FormatConverter {
  constructor(
    protected fileSystem: FileSystem,
    protected templateService: TemplateService
  ) {}

  abstract convert(content: Content, options?: ConvertOptions): Promise<Buffer>;

  protected handleError(error: unknown, code: ExportErrorCode, message: string): never {
    console.error(`Export error: ${message}`, error);
    if (error instanceof ExportError) {
      throw error;
    }
    throw new ExportError(
      code,
      message,
      error instanceof Error ? error.message : String(error)
    );
  }
} 