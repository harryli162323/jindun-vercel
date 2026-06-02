import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { setToken } from "@/lib/trpc";

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/auth.login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { username, password } }),
      });
      const data = await res.json();
      const result = data.result?.data?.json;
      if (result?.success && result?.token) {
        setToken(result.token);
        localStorage.setItem("jindun_user", result.username || username);
        onLogin(result.username || username);
      } else {
        const errMsg = data.error?.json?.message || data.error?.message;
        setError(errMsg || "用户名或密码错误");
      }
    } catch {
      setError("登录失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#A8D5B5] via-[#C5E8D2] to-[#E8F5EC]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#7BC89B] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#5DB882] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#9EDBB3] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md mx-4 glass-strong rounded-2xl shadow-2xl border-0">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5DB882] to-[#3A9B68] flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-800">
            上海金敦医疗器械进销存系统
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">请输入账号密码登录系统</p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="h-11 bg-white/60 border-[#A8D5B5]/50 focus:border-[#5DB882] focus:ring-[#5DB882]/20 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="h-11 bg-white/60 border-[#A8D5B5]/50 focus:border-[#5DB882] focus:ring-[#5DB882]/20 rounded-lg"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[#5DB882] to-[#3A9B68] hover:from-[#4DAF75] hover:to-[#2E8A5A] text-white font-medium rounded-lg shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "登录中..." : "登 录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
