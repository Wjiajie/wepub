import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserCircle } from "lucide-react"

const socialLinks = [
  {
    name: "作者联系方式",
    username: "@jiajiewu_ponder",
    url: "https://jike.city/jiajiewu_ponder",
    icon: "🎯"
  },
  {
    name: "wepub-blog",
    username: "@ponder",
    url: "https://www.jiajiewu.top/blog/wepub-covert-web-to-book",
    icon: "📝"
  },
  {
    name: "wepub gitHub链接",
    username: "@Wjiajie",
    url: "https://github.com/Wjiajie/wepub",
    icon: "🐱"
  }
]

export function AuthorCard() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="flex items-center justify-center w-9 h-9 rounded-md"
        >
          <UserCircle className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">查看作者信息</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="sr-only">
          <DialogTitle>作者信息</DialogTitle>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/avatar.jpg" alt="作者头像" />
              <AvatarFallback>JW</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">jiajiewu</CardTitle>
              <CardDescription className="mt-2">开发者</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📮 联系方式</h3>
              <div className="space-y-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <span className="text-xl">{link.icon}</span>
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{link.name}</p>
                      <p className="text-sm text-muted-foreground">{link.username}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
} 