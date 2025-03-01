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
  const [maxPages, setMaxPages] = useState(-1);
  const [maxDepth, setMaxDepth] = useState(3);
  const [concurrencyLimit, setConcurrencyLimit] = useState(1);
  const [isRSSMode, setIsRSSMode] = useState(false);
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
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);
  const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null);
  const [rangeEndIndex, setRangeEndIndex] = useState<number | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('keepHistory', JSON.stringify(keepHistory));
    }
  }, [keepHistory]);

  useEffect(() => {
    if (typeof window !== 'undefined' && results && keepHistory) {
      localStorage.setItem('crawlResults', JSON.stringify(results));
    }
  }, [results, keepHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    setSelectedArticleIndex(null);
    setIsErrorDialogOpen(false);

    try {
      const endpoint = isRSSMode ? '/api/rss' : '/api/crawl';
      const requestBody = isRSSMode ? { url } : { url, maxPages, maxDepth, concurrencyLimit };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

      if (keepHistory && results) {
        const existingUrls = new Set(results.results.map((r: CrawlResult) => r.url));
        const newResults = data.results.filter((r: CrawlResult) => !existingUrls.has(r.url));
        
        const combinedResults = {
          ...data,
          totalProcessed: data.totalProcessed + results.totalProcessed,
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

  const handleRangeSelectStart = (index: number) => {
    setIsRangeSelecting(true);
    setRangeStartIndex(index);
    setRangeEndIndex(index);
  };

  const handleRangeSelectMove = (index: number) => {
    if (isRangeSelecting && rangeStartIndex !== null) {
      setRangeEndIndex(index);
    }
  };

  const handleRangeSelectEnd = () => {
    if (isRangeSelecting && rangeStartIndex !== null && rangeEndIndex !== null && results) {
      if (rangeStartIndex !== rangeEndIndex) {
        const newSelected = new Set(selectedArticles);
        const start = Math.min(rangeStartIndex, rangeEndIndex);
        const end = Math.max(rangeStartIndex, rangeEndIndex);
        
        const shouldSelect = !selectedArticles.has(rangeStartIndex);
        
        for (let i = start; i <= end; i++) {
          if (shouldSelect) {
            newSelected.add(i);
          } else {
            newSelected.delete(i);
          }
        }
        
        setSelectedArticles(newSelected);
      }
      
      setIsRangeSelecting(false);
      setRangeStartIndex(null);
      setRangeEndIndex(null);
    }
  };

  const isInSelectionRange = (index: number): boolean => {
    if (!isRangeSelecting || rangeStartIndex === null || rangeEndIndex === null) {
      return false;
    }
    const start = Math.min(rangeStartIndex, rangeEndIndex);
    const end = Math.max(rangeStartIndex, rangeEndIndex);
    return index >= start && index <= end;
  };

  const handleExport = async (title: string, format: string, author: string, description: string, coverImage: string) => {
    if (!results || selectedArticles.size === 0) return;
    
    setIsExporting(true);
    try {
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
          description,
          coverImage
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '导出失败');
      }

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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={isRSSMode ? "输入RSS源URL..." : "输入网页URL..."}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? '处理中...' : '开始'}
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rss-mode"
                checked={isRSSMode}
                onCheckedChange={(checked) => setIsRSSMode(checked as boolean)}
              />
              <label
                htmlFor="rss-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                RSS源模式
              </label>
            </div>
            
            {!isRSSMode && (
              <>
                <div className="flex items-center space-x-2">
                  <label htmlFor="max-pages" className="text-sm">最大页数:</label>
                  <Input
                    id="max-pages"
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value))}
                    min="-1"
                    max="100"
                    className="w-20"
                  />
                  <span className="text-xs text-gray-500">(-1表示无限制)</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label htmlFor="max-depth" className="text-sm">最大深度:</label>
                  <Input
                    id="max-depth"
                    type="number"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                    min="1"
                    max="10"
                    className="w-20"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label htmlFor="concurrency-limit" className="text-sm">并发数:</label>
                  <Input
                    id="concurrency-limit"
                    type="number"
                    value={concurrencyLimit}
                    onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                    min="1"
                    max="8"
                    className="w-20"
                  />
                  <span className="text-xs text-gray-500">(大于1时不保证顺序)</span>
                </div>
              </>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="keep-history"
                checked={keepHistory}
                onCheckedChange={(checked) => setKeepHistory(checked as boolean)}
              />
              <label
                htmlFor="keep-history"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                保留历史记录
              </label>
            </div>
          </div>
        </div>
      </form>

      {error && (
        <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>错误</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-red-500">{error}</p>
              {errorDetail && <p className="text-sm text-gray-500">{errorDetail}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}

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
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>已解析的页面</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      已选择: {selectedArticles.size}/{results.results.length}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedArticles.size === results.results.length ? '取消全选' : '全选'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedArticles(new Set())}
                      disabled={selectedArticles.size === 0}
                    >
                      清除选择
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  <p>操作指南:</p>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    <li>单击文章或复选框可选中/取消选中</li>
                    <li>按住Alt键，点击鼠标左键并拖动鼠标可批量选择文章</li>
                    <li>拖动选择时，将以起始文章的相反状态设置范围内所有文章</li>
                  </ul>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div 
                  className="space-y-2 max-h-[600px] overflow-y-auto"
                  onMouseUp={handleRangeSelectEnd}
                  onMouseLeave={handleRangeSelectEnd}
                >
                  {results.results.map((result, index) => (
                    <div
                      key={`${result.url}-${index}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        isInSelectionRange(index) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      } ${isAltPressed ? 'cursor-crosshair' : ''}`}
                      onMouseDown={(e) => {
                        if (e.button === 0 && isAltPressed) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRangeSelectStart(index);
                        }
                      }}
                      onMouseOver={() => handleRangeSelectMove(index)}
                    >
                      <div 
                        className="flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArticle(index);
                        }}
                      >
                        <Checkbox
                          checked={selectedArticles.has(index)}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArticle(index);
                          setSelectedArticleIndex(index);
                        }}
                        className={`flex-1 text-left p-2 rounded-md transition-colors ${
                          selectedArticleIndex === index ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="font-medium truncate">
                          {result?.article?.title || '无标题'}
                        </div>
                        <div className="text-sm text-gray-500 truncate mt-1">
                          {result?.url || '无链接'}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>文章预览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-h-[600px] overflow-y-auto">
                  {selectedArticleIndex !== null && results.results[selectedArticleIndex] ? (
                    <>
                      <h1 className="text-xl font-bold mb-4">
                        {results.results[selectedArticleIndex]?.article?.title || '无标题'}
                      </h1>
                      {results.results[selectedArticleIndex]?.article?.byline && (
                        <p className="text-gray-600 text-sm mb-4">
                          {results.results[selectedArticleIndex].article.byline}
                        </p>
                      )}
                      <div
                        className="mt-4"
                        dangerouslySetInnerHTML={{
                          __html: results.results[selectedArticleIndex]?.article?.content || '无内容'
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