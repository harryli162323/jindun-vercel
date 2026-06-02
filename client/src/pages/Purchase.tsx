import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Eye, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { exportPurchaseOrdersExcel, exportPurchaseItemsExcel } from "@/lib/export";

interface PurchaseItem {
  productId: number; productName: string; spec: string; unit: string; supplier: string;
  purchasePrice: string; quantity: number; batchNo: string; productionDate: string; expiryDate: string;
}

export default function Purchase() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const orders = trpc.purchase.list.useQuery({ page, pageSize: 20 });
  const detail = trpc.purchase.detail.useQuery(
    { orderId: detailOrderId!, page: detailPage, pageSize: 50 },
    { enabled: !!detailOrderId }
  );
  const activeProducts = trpc.product.listActive.useQuery();
  const allOrders = trpc.purchase.exportAll.useQuery();
  const allItems = trpc.purchase.exportItems.useQuery({ orderId: detailOrderId || undefined }, { enabled: !!detailOrderId });
  const utils = trpc.useUtils();

  const createMutation = trpc.purchase.create.useMutation({
    onSuccess: () => { toast.success("进货订单创建成功"); setDialogOpen(false); setItems([]); utils.purchase.list.invalidate(); utils.inventory.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.purchase.update.useMutation({
    onSuccess: () => { toast.success("进货订单更新成功"); setDialogOpen(false); setItems([]); setEditingOrderId(null); utils.purchase.list.invalidate(); utils.inventory.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.purchase.delete.useMutation({
    onSuccess: () => { toast.success("进货订单已删除"); setDeleteId(null); utils.purchase.list.invalidate(); utils.inventory.list.invalidate(); },
    onError: (e) => { toast.error(e.message); setDeleteId(null); },
  });

  const addItem = () => {
    setItems([...items, { productId: 0, productName: "", spec: "", unit: "", supplier: "", purchasePrice: "", quantity: 1, batchNo: "", productionDate: "", expiryDate: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = activeProducts.data?.find((p: any) => p.id === Number(productId));
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        productName: product.name,
        spec: product.spec,
        unit: product.unit,
        supplier: product.supplier,
        purchasePrice: product.purchasePrice,
      };
      setItems(newItems);
    }
  };

  const openCreate = () => { setEditingOrderId(null); setItems([]); addItem(); setDialogOpen(true); };

  const openEdit = async (orderId: number) => {
    setEditingOrderId(orderId);
    const res = await fetch(`/api/trpc/purchase.detail?input=${encodeURIComponent(JSON.stringify({ json: { orderId, page: 1, pageSize: 999 } }))}`);
    const data = await res.json();
    const orderItems = data.result?.data?.json?.items || [];
    setItems(orderItems.map((item: any) => ({
      productId: item.productId, productName: item.productName, spec: item.spec,
      unit: item.unit, supplier: item.supplier, purchasePrice: item.purchasePrice,
      quantity: item.quantity, batchNo: item.batchNo, productionDate: item.productionDate, expiryDate: item.expiryDate,
    })));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    for (const item of items) {
      if (!item.productId || !item.batchNo || !item.productionDate || !item.expiryDate || item.quantity < 1) {
        toast.error("请完整填写所有产品信息");
        return;
      }
    }
    if (items.length === 0) { toast.error("请至少添加一个产品"); return; }
    if (editingOrderId) {
      updateMutation.mutate({ orderId: editingOrderId, items });
    } else {
      createMutation.mutate({ items });
    }
  };

  const totalPages = Math.ceil((orders.data?.total || 0) / 20);
  const detailTotalPages = Math.ceil((detail.data?.total || 0) / 50);
  const grandTotal = items.reduce((sum, item) => sum + parseFloat(item.purchasePrice || "0") * item.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Button onClick={() => allOrders.data && exportPurchaseOrdersExcel(allOrders.data)} variant="outline" className="glass-card ml-auto">
          <Download className="w-4 h-4 mr-2" />导出Excel
        </Button>
        <Button onClick={openCreate} className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
          <Plus className="w-4 h-4 mr-2" />新建进货订单
        </Button>
      </div>

      {/* Orders Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>创建日期</TableHead>
                <TableHead>进货总价</TableHead>
                <TableHead className="w-36">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.data?.data.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.orderNo}</TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</TableCell>
                  <TableCell>¥{parseFloat(o.totalAmount).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDetailOrderId(o.id); setDetailPage(1); setDetailOpen(true); }}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o.id)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteId(o.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!orders.data?.data || orders.data.data.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无进货订单</TableCell></TableRow>
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

      {/* Create/Edit Dialog — 1280×700 固定尺寸 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="glass-strong flex flex-col"
          style={{ width: "1280px", maxWidth: "calc(100vw - 2rem)", height: "700px", maxHeight: "calc(100vh - 2rem)" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>{editingOrderId ? "编辑进货订单" : "新建进货订单"}</span>
              <span className="text-sm font-normal text-muted-foreground">
                进货总价：<span className="text-[#3A9B68] font-bold text-base">¥{grandTotal.toFixed(2)}</span>
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* 表格区域：可滚动 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap w-8">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[180px]">选择产品 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[100px]">规格型号</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">进货单价</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">进货数量 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[120px]">产品批号 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[130px]">生产日期 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[130px]">有效期 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">小计</th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground text-center">{index + 1}</td>
                      <td className="px-3 py-2">
                        <Select value={item.productId ? String(item.productId) : ""} onValueChange={v => selectProduct(index, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择产品" /></SelectTrigger>
                          <SelectContent>
                            {activeProducts.data?.map((p: any) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name} - {p.spec}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input value={item.spec} disabled className="h-8 text-xs bg-muted/30 border-0" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={item.purchasePrice ? `¥${item.purchasePrice}` : ""} disabled className="h-8 text-xs bg-muted/30 border-0" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={item.batchNo} onChange={e => updateItem(index, 'batchNo', e.target.value)} placeholder="输入批号" className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="date" value={item.productionDate} onChange={e => updateItem(index, 'productionDate', e.target.value)} className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="date" value={item.expiryDate} onChange={e => updateItem(index, 'expiryDate', e.target.value)} className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium text-[#3A9B68]">
                          ¥{(parseFloat(item.purchasePrice || "0") * item.quantity).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeItem(index)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                        暂无产品，点击下方按钮添加
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2">
              <Button variant="outline" onClick={addItem} className="w-full border-dashed h-9 text-sm">
                <Plus className="w-4 h-4 mr-2" />添加产品
              </Button>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
              {editingOrderId ? "保存修改" : "确认提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog — 1280×700 固定尺寸 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="glass-strong flex flex-col"
          style={{ width: "1280px", maxWidth: "calc(100vw - 2rem)", height: "700px", maxHeight: "calc(100vh - 2rem)" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>订单详情 — {detail.data?.order?.orderNo}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-normal text-muted-foreground">
                  进货总价：<span className="text-[#3A9B68] font-bold">¥{detail.data?.order?.totalAmount ? parseFloat(detail.data.order.totalAmount).toLocaleString() : "—"}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => allItems.data && exportPurchaseItemsExcel(allItems.data)}>
                  <Download className="w-3.5 h-3.5 mr-1" />导出
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品名称</TableHead>
                    <TableHead>规格型号</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>供货厂家</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>批号</TableHead>
                    <TableHead>生产日期</TableHead>
                    <TableHead>有效期</TableHead>
                    <TableHead>小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.data?.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.spec}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-muted-foreground">{item.supplier}</TableCell>
                      <TableCell>¥{item.purchasePrice}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.batchNo}</TableCell>
                      <TableCell>{item.productionDate}</TableCell>
                      <TableCell>{item.expiryDate}</TableCell>
                      <TableCell className="font-medium text-[#3A9B68]">¥{item.subtotal}</TableCell>
                    </TableRow>
                  ))}
                  {(!detail.data?.items || detail.data.items.length === 0) && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无明细数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {detailTotalPages > 1 && (
            <div className="flex justify-center gap-2 pt-3 shrink-0 border-t">
              <Button variant="outline" size="sm" disabled={detailPage <= 1} onClick={() => setDetailPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground flex items-center">{detailPage}/{detailTotalPages}</span>
              <Button variant="outline" size="sm" disabled={detailPage >= detailTotalPages} onClick={() => setDetailPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除进货订单</AlertDialogTitle>
            <AlertDialogDescription>
              删除进货订单将同步回退库存数量。如果该批次产品已有部分被销售导致库存不足以回退，操作将被阻止。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ orderId: deleteId })}
              className="bg-red-500 hover:bg-red-600 text-white">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
