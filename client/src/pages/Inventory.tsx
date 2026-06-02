import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { exportInventoryExcel } from "@/lib/export";

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const inventory = trpc.inventory.list.useQuery({ page, pageSize: 20, search });
  const allInventory = trpc.inventory.exportAll.useQuery();

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const totalPages = Math.ceil((inventory.data?.total || 0) / 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="搜索产品名称或供应厂家..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="glass-card"
          />
          <Button onClick={handleSearch} variant="outline" size="icon" className="glass-card">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={() => allInventory.data && exportInventoryExcel(allInventory.data)} variant="outline" className="glass-card ml-auto">
          <Download className="w-4 h-4 mr-2" />导出Excel
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品名称</TableHead>
                <TableHead>规格型号</TableHead>
                <TableHead>计量单位</TableHead>
                <TableHead>供应厂家</TableHead>
                <TableHead>产品批号</TableHead>
                <TableHead>生产日期</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>库存数量</TableHead>
                <TableHead>入库日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.data?.data.map((item: any) => (
                <TableRow key={item.id} className={item.quantity <= 0 ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{item.spec}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.batchNo}</TableCell>
                  <TableCell>{item.productionDate}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${item.quantity <= 0 ? "text-red-500" : item.quantity <= 10 ? "text-orange-500" : "text-green-600"}`}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(item.inboundDate).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" })}</TableCell>
                </TableRow>
              ))}
              {(!inventory.data?.data || inventory.data.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无库存数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground flex items-center px-3">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
