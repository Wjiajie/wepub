'use client';

import { useState } from 'react';

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

interface CrawlResponse {
  results: CrawlResult[];
  totalProcessed: number;
  successCount: number;
}

export function SiteCrawler() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  const [maxDepth, setMaxDepth] = useState(3);
  const [results, setResults] = useState<CrawlResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedArticleIndex(null);

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, maxPages, maxDepth }),
      });

      if (!response.ok) {
        throw new Error('爬取失败');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
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

      {error && (
        <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium">爬取结果统计</h3>
            <p>总处理页面：{results.totalProcessed}</p>
            <p>成功解析：{results.successCount}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">已解析的页面</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {results.results.map((result, index) => (
                  <button
                    key={result.url}
                    onClick={() => setSelectedArticleIndex(index)}
                    className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                      selectedArticleIndex === index ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="font-medium truncate">{result.article.title}</div>
                    <div className="text-sm text-gray-500 truncate">{result.url}</div>
                  </button>
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
    </div>
  );
} 