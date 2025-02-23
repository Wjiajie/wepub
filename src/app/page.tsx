import { SiteCrawler } from '@/components/SiteCrawler';
import { ThemeToggle } from "@/components/ThemeToggle"
import { AuthorCard } from "@/components/AuthorCard"

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">WePub</h1>
            <span className="text-muted-foreground px-2">|</span>
            <h2 className="text-sm text-muted-foreground">网站内容批量转换</h2>
            <div className="flex items-center gap-3 ml-4">
              <AuthorCard />
              <div className="h-5 w-[1px] bg-border/60" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8">
        <SiteCrawler />
      </div>
    </main>
  );
}
