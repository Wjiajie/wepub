import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import MarkdownIt from 'markdown-it';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (title: string, format: string, author: string, description: string, coverImage: string) => Promise<void>;
  isExporting: boolean;
}

export function ExportDialog({ open, onOpenChange, onExport, isExporting }: ExportDialogProps) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('html');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [md, setMd] = useState<MarkdownIt | null>(null);
  
  useEffect(() => {
    // 在客户端初始化markdown-it
    if (typeof window !== 'undefined') {
      setMd(new MarkdownIt());
    }
  }, []);

  const handleExport = () => {
    // 传递空字符串作为封面图片，因为我们将使用 percollate 自动生成封面
    onExport(title, format, author, description, '');
    onOpenChange(false);
    setTitle('');
    setFormat('html');
    setAuthor('');
    setDescription('');
    setShowPreview(false);
  };

  const formatDescriptions = {
    html: '将导出为 HTML 文档集合（ZIP 格式），包含目录页面和文章间的导航链接',
    pdf: '将所有文章合并为一个 PDF 文档，支持目录和页码',
    epub: '将所有文章转换为电子书格式，适合在电子阅读器上阅读',
    md: '将导出为 Markdown 文档集合（ZIP 格式），包含目录和所有文章的 Markdown 文件'
  };

  const renderMarkdown = (text: string) => {
    if (!md) return '';
    return md.render(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            导出文档 <span className="text-xs text-gray-500 font-normal">(支持Markdown格式)</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 overflow-y-auto flex-grow">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                文档标题
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
                placeholder="请输入导出文档的标题..."
              />
              {title && showPreview && (
                <div className="mt-2 p-2 border rounded-md bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">预览:</div>
                  <div 
                    className="prose prose-sm max-w-none max-h-[80px] overflow-y-auto" 
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(title) }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-medium">
                作者
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full"
                placeholder="请输入作者名称（可选）..."
              />
              {author && showPreview && (
                <div className="mt-2 p-2 border rounded-md bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">预览:</div>
                  <div 
                    className="prose prose-sm max-w-none max-h-[80px] overflow-y-auto" 
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(author) }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                更多说明
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="请输入更多说明信息（可选）..."
              />
              {description && showPreview && (
                <div className="mt-2 p-2 border rounded-md bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">预览:</div>
                  <div 
                    className="prose prose-sm max-w-none max-h-[100px] overflow-y-auto" 
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(description) }}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                导出格式
              </Label>
              <RadioGroup
                value={format}
                onValueChange={setFormat}
                className="grid grid-cols-2 gap-4"
              >
                {Object.entries({
                  html: 'HTML',
                  pdf: 'PDF',
                  epub: 'EPUB',
                  md: 'Markdown'
                }).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value}>{label}</Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-gray-500 mt-2">
                {formatDescriptions[format as keyof typeof formatDescriptions]}
              </p>
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? '隐藏Markdown预览' : '显示Markdown预览'}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={!title || isExporting}>
            {isExporting ? '导出中...' : '导出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 