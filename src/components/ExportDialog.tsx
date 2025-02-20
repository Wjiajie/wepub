import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (title: string, format: string) => void;
}

// 支持的导出格式
const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF文档', description: '适合打印和阅读' },
  { value: 'epub', label: 'EPUB电子书', description: '适合在电子书阅读器中阅读' },
  { value: 'html', label: 'HTML网页', description: '适合在浏览器中查看' },
  { value: 'md', label: 'Markdown文档', description: '适合进一步编辑和修改' }
] as const;

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<string>('pdf');

  const handleExport = () => {
    onExport(title, format);
    onOpenChange(false);
    setTitle(''); // 重置标题
    setFormat('pdf'); // 重置格式
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导出文档</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              文档标题
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="请输入导出文档的标题..."
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">导出格式</Label>
            <RadioGroup
              value={format}
              onValueChange={setFormat}
              className="col-span-3 grid gap-3"
            >
              {EXPORT_FORMATS.map((f) => (
                <div key={f.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={f.value} id={f.value} className="mt-1" />
                  <Label
                    htmlFor={f.value}
                    className="grid gap-1 font-normal"
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {f.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={!title}>
            导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 