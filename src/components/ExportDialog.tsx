import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (title: string, format: string) => void;
}

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('html');

  const handleExport = () => {
    onExport(title, format);
    onOpenChange(false);
    setTitle('');
    setFormat('html');
  };

  const formatDescriptions = {
    html: '将导出为 HTML 文档集合（ZIP 格式），包含目录页面和文章间的导航链接',
    pdf: '将所有文章合并为一个 PDF 文档，支持目录和页码',
    epub: '将所有文章转换为电子书格式，适合在电子阅读器上阅读',
    md: '将导出为 Markdown 文档集合（ZIP 格式），包含目录和所有文章的 Markdown 文件'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">导出文档</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
            </div>

            <Card className="p-4 bg-gray-50">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">格式说明</h4>
                <p className="text-sm text-gray-600">
                  {formatDescriptions[format as keyof typeof formatDescriptions]}
                </p>
              </div>
            </Card>
          </div>
        </div>
        <DialogFooter className="sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-w-[100px]"
          >
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={!title}
            className="min-w-[100px]"
          >
            导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 