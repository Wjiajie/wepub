export enum ExportErrorCode {
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  PROCESS_ERROR = 'PROCESS_ERROR'
}

export class ExportError extends Error {
  constructor(
    public readonly code: ExportErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ExportError';
  }
} 