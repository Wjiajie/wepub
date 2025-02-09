import { SiteCrawler } from '@/components/SiteCrawler';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">WePub</h1>
      <section>
        <h2 className="text-2xl font-semibold mb-4">网站内容批量转换</h2>
        <SiteCrawler />
      </section>
    </main>
  );
}
