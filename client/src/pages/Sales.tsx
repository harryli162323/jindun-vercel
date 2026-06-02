import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Eye, Edit, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import { exportSalesOrdersExcel, exportSalesItemsExcel } from "@/lib/export";

interface SalesItem {
  productId: number; productName: string; spec: string; unit: string; supplier: string;
  purchasePrice: string; batchNo: string; quantity: number; salePrice: string; taxRate: string;
}

export default function Sales() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [items, setItems] = useState<SalesItem[]>([]);
  const [customerId, setCustomerId] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");

  const orders = trpc.sales.list.useQuery({
    page, pageSize: 20,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    customerName: customerSearch.trim() || undefined,
  });
  const detail = trpc.sales.detail.useQuery(
    { orderId: detailOrderId!, page: detailPage, pageSize: 50 },
    { enabled: !!detailOrderId }
  );
  const activeProducts = trpc.product.listActive.useQuery();
  const activeCustomers = trpc.customer.listActive.useQuery();
  const allOrders = trpc.sales.exportAll.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined });
  const allItems = trpc.sales.exportItems.useQuery({ orderId: detailOrderId || undefined }, { enabled: !!detailOrderId });
  const utils = trpc.useUtils();

  const createMutation = trpc.sales.create.useMutation({
    onSuccess: () => { toast.success("销售订单创建成功"); setDialogOpen(false); setItems([]); utils.sales.list.invalidate(); utils.inventory.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.sales.update.useMutation({
    onSuccess: () => { toast.success("销售订单更新成功"); setDialogOpen(false); setItems([]); setEditingOrderId(null); utils.sales.list.invalidate(); utils.inventory.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.sales.delete.useMutation({
    onSuccess: () => { toast.success("销售订单已删除，库存已恢复"); setDeleteId(null); utils.sales.list.invalidate(); utils.inventory.list.invalidate(); },
    onError: (e) => { toast.error(e.message); setDeleteId(null); },
  });

  const addItem = () => {
    setItems([...items, { productId: 0, productName: "", spec: "", unit: "", supplier: "", purchasePrice: "", batchNo: "", quantity: 1, salePrice: "", taxRate: "13" }]);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
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
        productId: product.id, productName: product.name, spec: product.spec,
        unit: product.unit, supplier: product.supplier, purchasePrice: product.purchasePrice, batchNo: "",
      };
      setItems(newItems);
    }
  };

  const selectCustomer = (cId: string) => {
    const customer = activeCustomers.data?.find((c: any) => c.id === Number(cId));
    if (customer) { setCustomerId(customer.id); setCustomerName(customer.name); }
  };

  const openCreate = () => { setEditingOrderId(null); setItems([]); setCustomerId(0); setCustomerName(""); addItem(); setDialogOpen(true); };

  const openEdit = async (orderId: number) => {
    setEditingOrderId(orderId);
    const res = await fetch(`/api/trpc/sales.detail?input=${encodeURIComponent(JSON.stringify({ json: { orderId, page: 1, pageSize: 999 } }))}`);
    const data = await res.json();
    const order = data.result?.data?.json?.order;
    const orderItems = data.result?.data?.json?.items || [];
    setCustomerId(order?.customerId || 0);
    setCustomerName(order?.customerName || "");
    setItems(orderItems.map((item: any) => ({
      productId: item.productId, productName: item.productName, spec: item.spec,
      unit: item.unit, supplier: item.supplier, purchasePrice: item.purchasePrice,
      batchNo: item.batchNo, quantity: item.quantity, salePrice: item.salePrice, taxRate: item.taxRate,
    })));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!customerId) { toast.error("请选择客户"); return; }
    for (const item of items) {
      if (!item.productId || !item.batchNo || !item.salePrice || item.quantity < 1) {
        toast.error("请完整填写所有产品信息");
        return;
      }
    }
    if (items.length === 0) { toast.error("请至少添加一个产品"); return; }
    if (editingOrderId) {
      updateMutation.mutate({ orderId: editingOrderId, customerId, customerName, items });
    } else {
      createMutation.mutate({ customerId, customerName, items });
    }
  };

  const totalPages = Math.ceil((orders.data?.total || 0) / 20);
  const detailTotalPages = Math.ceil((detail.data?.total || 0) / 50);
  const grandTotal = items.reduce((sum, item) => sum + parseFloat(item.salePrice || "0") * item.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 日期筛选 */}
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="w-36 glass-card" />
          <span className="text-muted-foreground text-sm">至</span>
          <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="w-36 glass-card" />
        </div>
        {/* 客户搜索 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="搜索客户名称..."
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setPage(1); }}
            className="pl-8 w-44 glass-card"
          />
          {customerSearch && (
            <button
              onClick={() => { setCustomerSearch(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={() => allOrders.data && exportSalesOrdersExcel(allOrders.data)} variant="outline" className="glass-card">
            <Download className="w-4 h-4 mr-2" />导出Excel
          </Button>
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
            <Plus className="w-4 h-4 mr-2" />新建销售订单
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>创建日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>产品数</TableHead>
                <TableHead>销售总价</TableHead>
                <TableHead>盈利金额</TableHead>
                <TableHead>利润率</TableHead>
                <TableHead className="w-36">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.data?.data.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.orderNo}</TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</TableCell>
                  <TableCell>{o.customerName}</TableCell>
                  <TableCell>{o.itemCount}</TableCell>
                  <TableCell>¥{parseFloat(o.totalAmount).toLocaleString()}</TableCell>
                  <TableCell className={parseFloat(o.profit) >= 0 ? 'text-green-600' : 'text-red-500'}>
                    ¥{parseFloat(o.profit).toLocaleString()}
                  </TableCell>
                  <TableCell>{o.profitRate}%</TableCell>
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
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {customerSearch ? `未找到客户"${customerSearch}"的销售订单` : "暂无销售订单"}
                  </TableCell>
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

      {/* Create/Edit Dialog — 1280×700 固定尺寸 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="glass-strong flex flex-col"
          style={{ width: "1280px", maxWidth: "calc(100vw - 2rem)", height: "700px", maxHeight: "calc(100vh - 2rem)" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="pr-8">{editingOrderId ? "编辑销售订单" : "新建销售订单"}</DialogTitle>
          </DialogHeader>

          {/* 产品表格区域：可滚动 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap w-8">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[180px]">选择产品 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[100px]">规格型号</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">进货单价</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[160px]">产品批号 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">销售数量 *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[110px]">销售单价(含税) *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">税率(%) *</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">销售总价</th>
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
                        <BatchSelector productId={item.productId} spec={item.spec} value={item.batchNo} onChange={v => updateItem(index, 'batchNo', v)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" step="0.01" value={item.salePrice} onChange={e => updateItem(index, 'salePrice', e.target.value)} placeholder="0.00" className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" step="0.01" value={item.taxRate} onChange={e => updateItem(index, 'taxRate', e.target.value)} placeholder="13" className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium text-[#3A9B68]">
                          ¥{(parseFloat(item.salePrice || "0") * item.quantity).toFixed(2)}
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

          {/* 底部：选择客户 + 销售总价（两行布局） */}
          <div className="shrink-0 border-t pt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">选择客户 *</Label>
                <Select value={customerId ? String(customerId) : ""} onValueChange={selectCustomer}>
                  <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="请选择客户" /></SelectTrigger>
                  <SelectContent>
                    {activeCustomers.data?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.warehouseAddress}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm text-muted-foreground">销售总价</span>
                  <div className="text-2xl font-bold text-[#3A9B68]">¥{grandTotal.toFixed(2)}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-gradient-to-r from-[#5DB882] to-[#3A9B68] text-white">
                    {editingOrderId ? "保存修改" : "确认提交"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
              <Button variant="outline" size="sm" onClick={() => allItems.data && exportSalesItemsExcel(allItems.data)}>
                <Download className="w-3.5 h-3.5 mr-1" />导出
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* 订单摘要 */}
          {detail.data?.order && (
            <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm p-3 bg-muted/30 rounded-lg">
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">客户</span>
                <span className="font-medium">{detail.data.order.customerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">销售总额</span>
                <span className="font-bold text-[#3A9B68]">¥{parseFloat(detail.data.order.totalAmount).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">盈利</span>
                <span className={`font-bold ${parseFloat(detail.data.order.profit) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ¥{parseFloat(detail.data.order.profit).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">利润率</span>
                <span className="font-bold">{detail.data.order.profitRate}%</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>批号</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>进货单价</TableHead>
                    <TableHead>销售单价</TableHead>
                    <TableHead>税率</TableHead>
                    <TableHead>销售总价</TableHead>
                    <TableHead>税费</TableHead>
                    <TableHead>利润</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.data?.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.spec}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.batchNo}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">¥{item.purchasePrice}</TableCell>
                      <TableCell>¥{item.salePrice}</TableCell>
                      <TableCell>{item.taxRate}%</TableCell>
                      <TableCell className="font-medium">¥{item.subtotal}</TableCell>
                      <TableCell className="text-orange-500">¥{item.taxAmount}</TableCell>
                      <TableCell className={parseFloat(item.profit) >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                        ¥{item.profit}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!detail.data?.items || detail.data.items.length === 0) && (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无明细数据</TableCell></TableRow>
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
            <AlertDialogTitle>确认删除销售订单</AlertDialogTitle>
            <AlertDialogDescription>
              删除销售订单将自动恢复对应的库存数量。确定要继续吗？
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

// Batch selector component with FIFO recommendation
function BatchSelector({ productId, spec, value, onChange }: { productId: number; spec: string; value: string; onChange: (v: string) => void }) {
  const inventory = trpc.inventory.byProduct.useQuery(
    { productId, spec },
    { enabled: !!productId && !!spec }
  );

  if (!productId || !spec) return <Input value={value} onChange={e => onChange(e.target.value)} placeholder="请先选择产品" disabled className="h-8 text-xs" />;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择批号" /></SelectTrigger>
      <SelectContent>
        {inventory.data?.map((inv: any) => (
          <SelectItem key={inv.id} value={inv.batchNo}>
            {inv.batchNo} (库存:{inv.quantity} 生产:{inv.productionDate})
          </SelectItem>
        ))}
        {(!inventory.data || inventory.data.length === 0) && (
          <SelectItem value="__none" disabled>无可用库存</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
