import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, TrendingUp, ShoppingCart, DollarSign, Receipt, PiggyBank, Percent } from "lucide-react";
import { exportDashboardExcel } from "@/lib/export";

const COLORS = ["#5DB882", "#3A9B68", "#7BC89B", "#A8D5B5", "#2E8A5A", "#4DAF75"];

export default function Dashboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMode, setFilterMode] = useState<"month" | "year" | "custom">("month");

  const currentMonth = now.getMonth() + 1;

  const monthData = trpc.dashboard.summary.useQuery({ year: selectedYear, month: currentMonth });
  const yearData = trpc.dashboard.summary.useQuery({ year: selectedYear });
  const customData = trpc.dashboard.summary.useQuery(
    startDate && endDate ? { startDate, endDate } : { year: selectedYear },
    { enabled: filterMode === "custom" && !!startDate && !!endDate }
  );
  const monthlyTrend = trpc.dashboard.monthlyTrend.useQuery({ year: selectedYear });
  const availableYears = trpc.dashboard.availableYears.useQuery();

  const years = useMemo(() => {
    const yrs = availableYears.data || [];
    if (!yrs.includes(now.getFullYear())) yrs.unshift(now.getFullYear());
    return Array.from(new Set(yrs)).sort((a, b) => b - a);
  }, [availableYears.data]);

  const displayData = filterMode === "custom" ? customData.data : filterMode === "month" ? monthData.data : yearData.data;

  const trendData = useMemo(() => {
    if (!monthlyTrend.data) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const found = monthlyTrend.data!.find((m: any) => m.month === i + 1);
      return {
        month: `${i + 1}月`,
        销售额: found ? parseFloat(found.totalSales) : 0,
        利润: found ? parseFloat(found.totalProfit) : 0,
        订单数: found ? found.orderCount : 0,
      };
    });
  }, [monthlyTrend.data]);

  const pieData = useMemo(() => {
    if (!displayData) return [];
    const sales = parseFloat(displayData.totalSales || "0");
    const cost = parseFloat(displayData.totalCost || "0");
    const tax = parseFloat(displayData.totalTax || "0");
    const profit = parseFloat(displayData.totalProfit || "0");
    if (sales === 0) return [];
    return [
      { name: "进货成本", value: cost },
      { name: "税费", value: tax },
      { name: "净利润", value: Math.max(0, profit) },
    ].filter((d) => d.value > 0);
  }, [displayData]);

  const handleExport = () => {
    const data = filterMode === "custom" ? customData.data : filterMode === "month" ? monthData.data : yearData.data;
    if (!data) return;
    const prefix = filterMode === "month" ? "月度数据概览" : filterMode === "year" ? "年度数据概览" : "自定义区间数据概览";
    exportDashboardExcel(data, trendData, prefix);
  };

  const statCards = [
    { label: "订单数量", value: displayData?.orderCount || 0, icon: ShoppingCart, suffix: "单" },
    { label: "销售总额", value: `¥${parseFloat(displayData?.totalSales || "0").toLocaleString()}`, icon: DollarSign },
    { label: "进货成本", value: `¥${parseFloat(displayData?.totalCost || "0").toLocaleString()}`, icon: Receipt },
    { label: "税费支出", value: `¥${parseFloat(displayData?.totalTax || "0").toLocaleString()}`, icon: PiggyBank },
    { label: "盈利金额", value: `¥${parseFloat(displayData?.totalProfit || "0").toLocaleString()}`, icon: TrendingUp },
    { label: "利润率", value: `${displayData?.profitRate || "0"}%`, icon: Percent },
  ];

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
          <SelectTrigger className="w-32 glass-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="year">本年度</SelectItem>
            <SelectItem value="custom">自定义区间</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-28 glass-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterMode === "custom" && (
          <>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 glass-card" />
            <span className="text-muted-foreground">至</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40 glass-card" />
          </>
        )}

        <Button onClick={handleExport} variant="outline" className="ml-auto glass-card hover:bg-[#5DB882]/10">
          <Download className="w-4 h-4 mr-2" />
          导出Excel
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="glass-card hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#5DB882]/10 flex items-center justify-center">
                  <card.icon className="w-4 h-4 text-[#5DB882]" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold text-foreground mt-1">
                {card.value}{card.suffix || ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{selectedYear}年月度销售趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F5EC" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #A8D5B5" }} />
                <Legend />
                <Bar dataKey="销售额" fill="#5DB882" radius={[4, 4, 0, 0]} />
                <Bar dataKey="利润" fill="#3A9B68" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{selectedYear}年月度订单趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F5EC" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #A8D5B5" }} />
                <Legend />
                <Line type="monotone" dataKey="订单数" stroke="#5DB882" strokeWidth={2} dot={{ fill: "#5DB882" }} />
                <Line type="monotone" dataKey="销售额" stroke="#3A9B68" strokeWidth={2} dot={{ fill: "#3A9B68" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">销售额构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              {pieData.length > 0 ? (
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #A8D5B5" }} />
                  <Legend />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">暂无数据</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {filterMode === "month" ? `${selectedYear}年${currentMonth}月` : filterMode === "year" ? `${selectedYear}年度` : "自定义区间"}数据摘要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">销售订单总数</span>
                <span className="text-lg font-semibold">{displayData?.orderCount || 0} 单</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">销售总额</span>
                <span className="text-lg font-semibold text-[#5DB882]">¥{parseFloat(displayData?.totalSales || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">净利润</span>
                <span className="text-lg font-semibold text-[#3A9B68]">¥{parseFloat(displayData?.totalProfit || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-muted-foreground">综合利润率</span>
                <span className="text-lg font-semibold">{displayData?.profitRate || "0"}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
