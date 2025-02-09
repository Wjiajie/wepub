'use client';

import { useState } from 'react';

export function ArticleConverter() {
  const [url, setUrl] = useState('');
  const [article, setArticle] = useState<{
    title: string;
    content: string;
    byline: string;
    length: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('解析文章失败');
      }

      const data = await response.json();
      setArticle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入网页URL..."
            required
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '解析中...' : '转换'}
          </button>
        </div>
      </form>

      {error && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {article && (
        <article className="max-w-2xl mx-auto prose lg:prose-xl">
          <h1>{article.title}</h1>
          {article.byline && <p className="text-gray-600">{article.byline}</p>}
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>
      )}
    </div>
  );
} 