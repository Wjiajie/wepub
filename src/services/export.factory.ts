import { FormatConverter } from '@/core/interfaces/converter.interface';
import { FileSystemService } from './file.service';
import { TemplateService } from './template.service';
import { HTMLConverter } from './converters/html.converter';
import { PDFConverter } from './converters/pdf.converter';
import { EPUBConverter } from './converters/epub.converter';
import { MarkdownConverter } from './converters/markdown.converter';

export class ExportFactory {
  private static fileSystem = new FileSystemService();
  private static templateService = new TemplateService();
  
  static createConverter(format: string): FormatConverter {
    switch (format) {
      case 'html':
        return new HTMLConverter(this.fileSystem, this.templateService);
      case 'pdf':
        return new PDFConverter(this.fileSystem, this.templateService);
      case 'epub':
        return new EPUBConverter(this.fileSystem, this.templateService);
      case 'md':
        return new MarkdownConverter(this.fileSystem, this.templateService);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
} 