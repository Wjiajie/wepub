import { ArticleConverter } from '@/components/ArticleConverter';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">WePub</h1>
      <ArticleConverter />
    </main>
  );
}
