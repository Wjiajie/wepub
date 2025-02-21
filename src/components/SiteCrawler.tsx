'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportDialog } from '@/components/ExportDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  const [keepHistory, setKeepHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 在组件挂载时从 localStorage 加载用户偏好和历史数据
  useEffect(() => {
    const saved = localStorage?.getItem('keepHistory');
    if (saved) {
      setKeepHistory(JSON.parse(saved));
      const savedResults = localStorage.getItem('crawlResults');
      if (savedResults) {
        setResults(JSON.parse(savedResults));
      }
    }
  }, []);

  // 当 keepHistory 变化时保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('keepHistory', JSON.stringify(keepHistory));
    }
  }, [keepHistory]);

  // 当结果变化时，如果开启了历史保留，则保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && results && keepHistory) {
      localStorage.setItem('crawlResults', JSON.stringify(results));
    }
  }, [results, keepHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);
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

      // 如果保留历史，合并新旧结果
      if (keepHistory && results) {
        // 创建一个Set来存储已有的URL
        const existingUrls = new Set(results.results.map((r: CrawlResult) => r.url));
        // 过滤掉已存在的URL
        const newResults = data.results.filter((r: CrawlResult) => !existingUrls.has(r.url));
        
        const combinedResults = {
          ...data,
          totalProcessed: data.totalProcessed + results.totalProcessed,
          // 只计算新增的成功数量
          successCount: results.successCount + newResults.length,
          results: [...results.results, ...newResults],
          errors: [...(results.errors || []), ...(data.errors || [])],
        };
        setResults(combinedResults);
      } else {
        setResults(data);
      }
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

  const handleExport = async (title: string, format: string, author: string, description: string) => {
    if (!results || selectedArticles.size === 0) return;
    
    setIsExporting(true);
    try {
      // 获取选中文章的内容
      const selectedContents = Array.from(selectedArticles).map(index => ({
        url: results.results[index].url,
        title: results.results[index].article.title,
        content: results.results[index].article.content
      }));

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: selectedContents,
          format,
          title,
          author,
          description
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '导出失败');
      }

      // 处理文件下载
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'html' || format === 'md' ? 'zip' : format;
      a.download = `${title}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
      setErrorDetail('导出过程中发生错误，请稍后重试');
      setIsErrorDialogOpen(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* 主要输入区域 */}
      <Card>
        <CardHeader className="text-center">
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-gray-700">
                网站URL
              </label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="输入网站URL..."
                required
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                提示：输入网站的根URL，系统会自动爬取其下的所有子页面
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="maxPages" className="text-sm font-medium text-gray-700">
                  最大页面数量
                </label>
                <Input
                  id="maxPages"
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  限制爬取的总页面数量（1-50）
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="maxDepth" className="text-sm font-medium text-gray-700">
                  递归深度
                </label>
                <Input
                  id="maxDepth"
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  限制递归查找的层级（1-10）
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="keepHistory"
                checked={keepHistory}
                onCheckedChange={(checked) => setKeepHistory(checked as boolean)}
              />
              <label
                htmlFor="keepHistory"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                保留历史内容（刷新页面不会丢失）
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>爬取中...</span>
                </div>
              ) : (
                '开始爬取'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 错误提示对话框 */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {error || '爬取失败'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-red-800">
                {errorDetail || '未知错误'}
              </pre>
            </div>
            {results?.errors && results.errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">各页面详细错误：</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {results.errors.map((error, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm text-gray-700 mb-1">
                          {error.url}
                        </p>
                        <p className="text-sm text-red-600 mb-1">{error.error}</p>
                        {error.errorDetail && (
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {error.errorDetail}
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 结果展示区域 */}
      {results && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">爬取结果统计</h3>
                  <div className="text-sm text-gray-500 space-x-4">
                    <span>总处理页面：{results.totalProcessed}</span>
                    <span>成功解析：{results.successCount}</span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={toggleSelectAll}
                    disabled={isExporting}
                    className="min-w-[100px]"
                  >
                    {selectedArticles.size === results.results.length ? '取消全选' : '全选'}
                  </Button>
                  <Button
                    onClick={() => setIsExportDialogOpen(true)}
                    disabled={selectedArticles.size === 0 || isExporting}
                    className="min-w-[120px]"
                  >
                    {isExporting ? '导出中...' : '导出选中页面'}
                  </Button>
                  {keepHistory && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setResults(null);
                        localStorage.removeItem('crawlResults');
                        setSelectedArticles(new Set());
                        setSelectedArticleIndex(null);
                      }}
                      disabled={isExporting}
                      className="min-w-[120px]"
                    >
                      清空历史
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">已解析的页面</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {results.results.map((result, index) => (
                    <div
                      key={`${result.url}-${index}`}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Checkbox
                        checked={selectedArticles.has(index)}
                        onCheckedChange={() => toggleArticle(index)}
                      />
                      <button
                        onClick={() => setSelectedArticleIndex(index)}
                        className={`flex-1 text-left p-2 rounded-md transition-colors ${
                          selectedArticleIndex === index ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="font-medium truncate">{result.article.title}</div>
                        <div className="text-sm text-gray-500 truncate mt-1">{result.url}</div>
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">文章预览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-h-[600px] overflow-y-auto">
                  {selectedArticleIndex !== null ? (
                    <>
                      <h1 className="text-xl font-bold mb-4">
                        {results.results[selectedArticleIndex].article.title}
                      </h1>
                      {results.results[selectedArticleIndex].article.byline && (
                        <p className="text-gray-600 text-sm mb-4">
                          {results.results[selectedArticleIndex].article.byline}
                        </p>
                      )}
                      <div
                        className="mt-4"
                        dangerouslySetInnerHTML={{
                          __html: results.results[selectedArticleIndex].article.content,
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-500">
                      选择左侧文章以查看内容
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
} 