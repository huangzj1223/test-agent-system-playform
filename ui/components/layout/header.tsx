"use client";

import { Bell, CircleHelp, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusIcon } from "@/components/icons";

interface HeaderProps {
  title?: string;
  eyebrow?: string | null;
  children?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({
  title,
  eyebrow = "智能质量控制中心",
  children,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b bg-white/90 px-4 shadow-[0_8px_28px_rgba(32,36,56,0.04)] backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={onMenuClick}
          aria-label="打开导航"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && (
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">{eyebrow}</div>
            ) : null}
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
          </div>
        )}
        {children}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="mr-1 hidden items-center gap-2 rounded-lg border bg-[hsl(var(--agent-running)/0.07)] px-3 py-2 text-xs text-foreground md:flex">
          <StatusIcon status="running" />
          智能体链路在线
        </div>
        <IconButton label="通知"><Bell className="h-4 w-4" /></IconButton>
        <IconButton label="帮助"><CircleHelp className="h-4 w-4" /></IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><UserRound className="h-4 w-4" /></AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">测试用户</p>
                <p className="text-xs text-muted-foreground">test@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><UserRound className="mr-2 h-4 w-4" />个人资料</DropdownMenuItem>
            <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />系统设置</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label={label} title={label}>
      {children}
    </Button>
  );
}
