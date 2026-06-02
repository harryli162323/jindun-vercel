import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp,
  Warehouse, Users, LogOut, Key, Menu, X, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AppLayoutProps {
  children: React.ReactNode;
  username: string;
  onLogout: () => void;
}

const navItems = [
  { path: "/", label: "数据概览", icon: LayoutDashboard },
  { path: "/products", label: "产品管理", icon: Package },
  { path: "/purchase", label: "进货管理", icon: ShoppingCart },
  { path: "/sales", label: "销售管理", icon: TrendingUp },
  { path: "/inventory", label: "库存管理", icon: Warehouse },
  { path: "/customers", label: "客户管理", icon: Users },
];

export default function AppLayout({ children, username, onLogout }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("新密码至少4位");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await fetch("/api/trpc/auth.changePassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { username, oldPassword: oldPwd, newPassword: newPwd } }),
      });
      const data = await res.json();
      if (data.result?.data?.json?.success) {
        toast.success("密码修改成功");
        setPwdOpen(false);
        setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        toast.error(data.error?.json?.message || "密码修改失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setPwdLoading(false);
    }
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? 'w-64' : sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300`}>
      {/* Logo area */}
      <div className={`flex items-center ${sidebarOpen || mobile ? 'px-5' : 'px-3 justify-center'} h-16 border-b border-border/50`}>
        {(sidebarOpen || mobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5DB882] to-[#3A9B68] flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground whitespace-nowrap">金敦医疗器械</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5DB882] to-[#3A9B68] flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} onClick={() => mobile && setMobileOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group
                ${isActive
                  ? 'bg-gradient-to-r from-[#5DB882]/15 to-[#A8D5B5]/10 text-[#3A9B68] font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#5DB882]' : ''}`} />
                {(sidebarOpen || mobile) && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
                {isActive && (sidebarOpen || mobile) && (
                  <ChevronRight className="w-4 h-4 ml-auto text-[#5DB882]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`border-t border-border/50 p-3 space-y-1`}>
        <button
          onClick={() => setPwdOpen(true)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200`}
        >
          <Key className="w-5 h-5 flex-shrink-0" />
          {(sidebarOpen || mobile) && <span className="text-sm">修改密码</span>}
        </button>
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-200`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(sidebarOpen || mobile) && <span className="text-sm">退出登录</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col glass-card border-r border-border/30 fixed left-0 top-0 bottom-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 glass-strong shadow-xl">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-60' : 'md:ml-16'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-4 md:px-6 glass border-b border-border/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (window.innerWidth < 768) setMobileOpen(true); else setSidebarOpen(!sidebarOpen); }}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-sm font-medium text-foreground hidden sm:block">
              {navItems.find(n => n.path === location)?.label || "数据概览"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">欢迎，{username}</span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Change password dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>原密码</Label>
              <Input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="请输入原密码" />
            </div>
            <div className="space-y-2">
              <Label>新密码</Label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="请输入新密码" />
            </div>
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="请再次输入新密码" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>取消</Button>
            <Button onClick={handleChangePassword} disabled={pwdLoading}
              className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
              {pwdLoading ? "保存中..." : "确认修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
