'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportDialog } from '@/components/ExportDialog';

interface Article {
  title: string;
  content: string;
  byline?: string;
  excerpt?: string;
}

interface CrawlResult {
  url: string;
  article: Article;
  success: boolean;
}

interface CrawlError {
  url: string;
  error: string;
  errorDetail?: string;
}

interface CrawlResponse {
  results: CrawlResult[];
  totalProcessed: number;
  successCount: number;
  error?: string;
  errorDetail?: string;
  errors?: CrawlError[];
}

export function SiteCrawler() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  const [maxDepth, setMaxDepth] = useState(3);
  const [results, setResults] = useState<CrawlResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    setResults(null);
    setSelectedArticleIndex(null);
    setIsErrorDialogOpen(false);

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, maxPages, maxDepth }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '爬取失败');
        setErrorDetail(data.errorDetail);
        setIsErrorDialogOpen(true);
        return;
      }

      if (data.error) {
        setError(data.error);
        setErrorDetail(data.errorDetail);
        setIsErrorDialogOpen(true);
      }

      setResults(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      setError(errorMessage);
      setErrorDetail('请检查网络连接并稍后重试');
      setIsErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (results) {
      if (selectedArticles.size === results.results.length) {
        setSelectedArticles(new Set());
      } else {
        setSelectedArticles(new Set(results.results.map((_, index) => index)));
      }
    }
  };

  const toggleArticle = (index: number) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedArticles(newSelected);
  };

  const handleExport = async (title: string) => {
    if (!results) return;

    const selectedArticlesList = Array.from(selectedArticles).map(
      index => {
        const result = results.results[index];
        return {
          url: result.url,
          article: {
            title: result.article.title,
            content: result.article.content,
            byline: result.article.byline,
            excerpt: result.article.excerpt
          }
        };
      }
    );

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          articles: selectedArticlesList,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '导出失败');
      }

      // 获取二进制数据
      const blob = await response.blob();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.epub`;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('导出失败:', err);
      setError(err instanceof Error ? err.message : '导出失败');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-1">
              网站URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="输入网站URL..."
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="mt-1 text-sm text-gray-500">
              提示：输入网站的根URL，系统会自动爬取其下的所有子页面
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxPages" className="block text-sm font-medium mb-1">
                最大页面数量
              </label>
              <input
                id="maxPages"
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                min="1"
                max="50"
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="mt-1 text-sm text-gray-500">
                限制爬取的总页面数量（1-50）
              </p>
            </div>

            <div>
              <label htmlFor="maxDepth" className="block text-sm font-medium mb-1">
                递归深度
              </label>
              <input
                id="maxDepth"
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                min="1"
                max="10"
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="mt-1 text-sm text-gray-500">
                限制递归查找的层级（1-10）
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '爬取中...' : '开始爬取'}
          </button>
        </div>
      </form>

      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {error || '爬取失败'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-red-800">
                {errorDetail || '未知错误'}
              </pre>
            </div>
            {results?.errors && results.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">各页面详细错误：</h4>
                <div className="max-h-60 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {error.url}
                      </p>
                      <p className="text-sm text-red-600 mb-1">{error.error}</p>
                      {error.errorDetail && (
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {error.errorDetail}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {results && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-100 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-medium">爬取结果统计</h3>
              <p>总处理页面：{results.totalProcessed}</p>
              <p>成功解析：{results.successCount}</p>
            </div>
            <div className="space-x-4">
              <Button
                variant="outline"
                onClick={toggleSelectAll}
              >
                {selectedArticles.size === results.results.length ? '取消全选' : '全选'}
              </Button>
              <Button
                onClick={() => setIsExportDialogOpen(true)}
                disabled={selectedArticles.size === 0}
              >
                导出选中页面
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">已解析的页面</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {results.results.map((result, index) => (
                  <div
                    key={result.url}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <Checkbox
                      checked={selectedArticles.has(index)}
                      onCheckedChange={() => toggleArticle(index)}
                    />
                    <button
                      onClick={() => setSelectedArticleIndex(index)}
                      className={`flex-1 text-left ${
                        selectedArticleIndex === index ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="font-medium truncate">{result.article.title}</div>
                      <div className="text-sm text-gray-500 truncate">{result.url}</div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">文章预览</h3>
              <div className="prose max-h-[500px] overflow-y-auto">
                {selectedArticleIndex !== null ? (
                  <>
                    <h1>{results.results[selectedArticleIndex].article.title}</h1>
                    {results.results[selectedArticleIndex].article.byline && (
                      <p className="text-gray-600">
                        {results.results[selectedArticleIndex].article.byline}
                      </p>
                    )}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: results.results[selectedArticleIndex].article.content,
                      }}
                    />
                  </>
                ) : (
                  <p className="text-gray-500">选择左侧文章以查看内容</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onExport={handleExport}
      />
    </div>
  );
} 