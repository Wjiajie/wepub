import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (title: string, format: string) => void;
}

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [title, setTitle] = useState('');

  const handleExport = () => {
    onExport(title, 'html');
    onOpenChange(false);
    setTitle('');
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
            <Card className="p-4 bg-gray-50">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">导出格式说明</h4>
                <p className="text-sm text-gray-600">
                  将导出为 HTML 文档集合（ZIP 格式），包含：
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>所有选中的文章页面</li>
                  <li>带有目录的索引页面</li>
                  <li>文章间的导航链接</li>
                </ul>
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