import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, Edit, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { exportProductsExcel } from "@/lib/export";

export default function Products() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", spec: "", unit: "", supplier: "", purchasePrice: "", remark: "" });

  const products = trpc.product.list.useQuery({ page, pageSize: 20, search });
  const allProducts = trpc.product.exportAll.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => { toast.success("产品创建成功"); setDialogOpen(false); resetForm(); utils.product.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => { toast.success("产品更新成功"); setDialogOpen(false); resetForm(); utils.product.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => { toast.success("产品已删除"); setDeleteId(null); utils.product.list.invalidate(); },
    onError: (e) => {
      if (e.message === "REFERENCED") {
        toast.error("该产品已被订单引用，将改为停用");
        disableMutation.mutate({ id: deleteId! });
      } else {
        toast.error(e.message);
      }
      setDeleteId(null);
    },
  });
  const disableMutation = trpc.product.disable.useMutation({
    onSuccess: () => { toast.success("产品已停用"); utils.product.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ name: "", spec: "", unit: "", supplier: "", purchasePrice: "", remark: "" });
    setEditingProduct(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({ name: p.name, spec: p.spec, unit: p.unit, supplier: p.supplier, purchasePrice: p.purchasePrice, remark: p.remark || "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.spec || !form.unit || !form.supplier || !form.purchasePrice) {
      toast.error("请填写所有必填项");
      return;
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const totalPages = Math.ceil((products.data?.total || 0) / 20);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="搜索产品名称、规格、厂家..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="glass-card"
          />
          <Button onClick={handleSearch} variant="outline" size="icon" className="glass-card">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={() => allProducts.data && exportProductsExcel(allProducts.data)} variant="outline" className="glass-card">
            <Download className="w-4 h-4 mr-2" />导出Excel
          </Button>
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
            <Plus className="w-4 h-4 mr-2" />新建产品
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">序号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>规格型号</TableHead>
                <TableHead>计量单位</TableHead>
                <TableHead>供货厂家</TableHead>
                <TableHead>进货单价</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data?.data.map((p: any, i: number) => (
                <TableRow key={p.id}>
                  <TableCell>{(page - 1) * 20 + i + 1}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.spec}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>{p.supplier}</TableCell>
                  <TableCell>¥{p.purchasePrice}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.status === 'active' ? '正常' : '已停用'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[100px] truncate">{p.remark || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      {p.status === 'active' && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} className="h-8 w-8 text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!products.data?.data || products.data.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无产品数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
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
          className="glass-strong max-w-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editingProduct ? "编辑产品" : "新建产品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>产品名称 *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="请输入产品名称" />
              </div>
              <div className="space-y-2">
                <Label>规格型号 *</Label>
                <Input value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} placeholder="请输入规格型号" />
              </div>
              <div className="space-y-2">
                <Label>计量单位 *</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="如：个、盒、支" />
              </div>
              <div className="space-y-2">
                <Label>供货厂家 *</Label>
                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="请输入供货厂家" />
              </div>
              <div className="space-y-2">
                <Label>进货单价 *</Label>
                <Input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="选填" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
              {editingProduct ? "保存修改" : "创建产品"}
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
              确定要删除该产品吗？如果该产品已被订单引用，将自动改为停用状态。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-500 hover:bg-red-600 text-white">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
