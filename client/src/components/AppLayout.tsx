import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, Boxes, Users, LogOut, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "数据概览", icon: LayoutDashboard },
  { href: "/products", label: "产品管理", icon: Package },
  { href: "/purchase", label: "进货管理", icon: ShoppingCart },
  { href: "/sales", label: "销售管理", icon: TrendingUp },
  { href: "/inventory", label: "库存管理", icon: Boxes },
  { href: "/customers", label: "客户管理", icon: Users },
];

interface AppLayoutProps {
  username: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AppLayout({ username, onLogout, children }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitles: Record<string, string> = {
    "/dashboard": "数据概览",
    "/": "数据概览",
    "/products": "产品管理",
    "/purchase": "进货管理",
    "/sales": "销售管理",
    "/inventory": "库存管理",
    "/customers": "客户管理",
  };

  const currentTitle = pageTitles[location] || "进销存系统";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5EC] via-[#F0FAF4] to-[#E0F2E8] flex">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full z-50 w-60 flex flex-col glass-strong border-r border-[#A8D5B5]/30 transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#A8D5B5]/30">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5DB882] to-[#3A9B68] flex items-center justify-center shadow-md flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 leading-tight">上海金敦医疗器械</p>
            <p className="text-xs text-muted-foreground">进销存管理系统</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden h-7 w-7" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white shadow-sm"
                    : "text-gray-600 hover:bg-[#5DB882]/10 hover:text-[#3A9B68]"
                )}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-[#A8D5B5]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#5DB882]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-[#3A9B68]">{username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{username}</p>
              <p className="text-xs text-muted-foreground">管理员</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-gray-600 hover:text-red-600 hover:border-red-200"
            onClick={onLogout}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass-strong border-b border-[#A8D5B5]/30 px-4 lg:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold text-gray-800">{currentTitle}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
