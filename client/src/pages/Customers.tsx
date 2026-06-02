import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { exportCustomersExcel } from "@/lib/export";

export default function Customers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", warehouseAddress: "", contactPerson: "" });

  const customers = trpc.customer.list.useQuery({ page, pageSize: 20, search });
  const utils = trpc.useUtils();

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => { toast.success("客户创建成功"); setDialogOpen(false); resetForm(); utils.customer.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.customer.update.useMutation({
    onSuccess: () => { toast.success("客户更新成功"); setDialogOpen(false); resetForm(); utils.customer.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => { toast.success("客户已删除"); setDeleteId(null); utils.customer.list.invalidate(); },
    onError: (e) => {
      if (e.message === "REFERENCED") {
        toast.error("该客户已被订单引用，将改为停用");
        disableMutation.mutate({ id: deleteId! });
      } else {
        toast.error(e.message);
      }
      setDeleteId(null);
    },
  });
  const disableMutation = trpc.customer.disable.useMutation({
    onSuccess: () => { toast.success("客户已停用"); utils.customer.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => { setForm({ name: "", warehouseAddress: "", contactPerson: "" }); setEditingCustomer(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setEditingCustomer(c);
    setForm({ name: c.name, warehouseAddress: c.warehouseAddress, contactPerson: c.contactPerson || "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.warehouseAddress) { toast.error("客户名称和仓库地址为必填项"); return; }
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const totalPages = Math.ceil((customers.data?.total || 0) / 20);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="搜索客户名称..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="glass-card"
          />
          <Button onClick={handleSearch} variant="outline" size="icon" className="glass-card">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={() => {
          utils.client.customer.allForExport.query().then(data => exportCustomersExcel(data)).catch(() => toast.error('导出失败'));
        }} variant="outline" className="glass-card hover:bg-[#5DB882]/10">
          <Download className="w-4 h-4 mr-2" />导出Excel
        </Button>
        <Button onClick={openCreate} className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
          <Plus className="w-4 h-4 mr-2" />新增客户
        </Button>
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">序号</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>仓库地址</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.data?.data.map((c: any, i: number) => (
                <TableRow key={c.id}>
                  <TableCell>{(page - 1) * 20 + i + 1}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.warehouseAddress}</TableCell>
                  <TableCell>{c.contactPerson || '-'}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status === 'active' ? '正常' : '已停用'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      {c.status === 'active' && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="h-8 w-8 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!customers.data?.data || customers.data.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无客户数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground flex items-center px-3">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="glass-strong max-w-xl"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "编辑客户" : "新增客户"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>客户名称 *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="请输入客户名称" />
            </div>
            <div className="space-y-2">
              <Label>仓库地址 *</Label>
              <Input value={form.warehouseAddress} onChange={e => setForm({ ...form, warehouseAddress: e.target.value })} placeholder="请输入仓库地址" />
            </div>
            <div className="space-y-2">
              <Label>联系人</Label>
              <Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="选填" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
              {editingCustomer ? "保存修改" : "创建客户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该客户吗？如果该客户已被订单引用，将自动改为停用状态。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-500 hover:bg-red-600 text-white">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
