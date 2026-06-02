import * as XLSX from "xlsx";

function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createAndDownload(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportDashboardExcel(data: any, trendData: any[], prefix: string) {
  const wb = XLSX.utils.book_new();
  const summaryRows = [
    ["数据概览报表"],
    [""],
    ["指标", "数值"],
    ["订单数量", data.orderCount || 0],
    ["销售总额(元)", data.totalSales || "0.00"],
    ["进货成本(元)", data.totalCost || "0.00"],
    ["税费支出(元)", data.totalTax || "0.00"],
    ["盈利金额(元)", data.totalProfit || "0.00"],
    ["利润率(%)", data.profitRate || "0.00"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "数据概览");
  if (trendData && trendData.length > 0) {
    const trendRows = [
      ["月份", "销售额(元)", "利润(元)", "订单数"],
      ...trendData.map((t) => [
        `${t.month}月`,
        t.销售额 ?? t.totalSales ?? 0,
        t.利润 ?? t.totalProfit ?? 0,
        t.订单数 ?? t.orderCount ?? 0,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(trendRows);
    ws2["!cols"] = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "月度趋势");
  }
  createAndDownload(wb, `${prefix}_${formatDate()}.xlsx`);
}

export function exportProductsExcel(products: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["序号", "产品名称", "规格型号", "计量单位", "供货厂家", "进货单价(元)", "状态", "备注"],
    ...products.map((p, i) => [
      i + 1, p.name, p.spec, p.unit, p.supplier, p.purchasePrice,
      p.status === "active" ? "正常" : "已停用", p.remark || "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "产品列表");
  createAndDownload(wb, `产品列表_${formatDate()}.xlsx`);
}

export function exportPurchaseOrdersExcel(orders: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["订单号", "创建日期", "进货总价(元)"],
    ...orders.map((o) => [
      o.orderNo,
      new Date(o.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      o.totalAmount,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, "进货订单");
  createAndDownload(wb, `进货订单_${formatDate()}.xlsx`);
}

export function exportPurchaseItemsExcel(items: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["产品名称", "规格型号", "计量单位", "供货厂家", "进货单价(元)", "数量", "批号", "生产日期", "有效期", "小计(元)"],
    ...items.map((item) => [
      item.productName, item.spec, item.unit, item.supplier, item.purchasePrice,
      item.quantity, item.batchNo, item.productionDate, item.expiryDate, item.subtotal,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "进货明细");
  createAndDownload(wb, `进货订单明细_${formatDate()}.xlsx`);
}

export function exportSalesOrdersExcel(orders: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["订单号", "创建日期", "客户名称", "产品数量", "销售总价(元)", "进货成本(元)", "税费(元)", "盈利金额(元)", "利润率(%)"],
    ...orders.map((o) => [
      o.orderNo,
      new Date(o.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      o.customerName, o.itemCount, o.totalAmount, o.totalCost, o.totalTax, o.profit, o.profitRate,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "销售订单");
  createAndDownload(wb, `销售订单_${formatDate()}.xlsx`);
}

export function exportSalesItemsExcel(items: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["产品名称", "规格型号", "计量单位", "供货厂家", "进货单价(元)", "批号", "数量", "销售单价(元)", "税率(%)", "销售总价(元)", "税费(元)", "成本(元)", "利润(元)"],
    ...items.map((item) => [
      item.productName, item.spec, item.unit, item.supplier, item.purchasePrice,
      item.batchNo, item.quantity, item.salePrice, item.taxRate,
      item.subtotal, item.taxAmount, item.cost, item.profit,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "销售明细");
  createAndDownload(wb, `销售订单明细_${formatDate()}.xlsx`);
}

export function exportCustomersExcel(customers: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["序号", "客户名称", "仓库地址", "联系人", "状态", "创建日期"],
    ...customers.map((c: any, i: number) => [
      i + 1, c.name, c.warehouseAddress, c.contactPerson || "",
      c.status === "active" ? "正常" : "已停用",
      new Date(c.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, "客户列表");
  createAndDownload(wb, `客户列表_${formatDate()}.xlsx`);
}

export function exportInventoryExcel(items: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["产品名称", "规格型号", "计量单位", "供应厂家", "批号", "生产日期", "有效期", "库存数量", "入库日期"],
    ...items.map((item) => [
      item.productName, item.spec, item.unit, item.supplier, item.batchNo,
      item.productionDate, item.expiryDate, item.quantity,
      new Date(item.inboundDate).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, "库存报表");
  createAndDownload(wb, `库存报表_${formatDate()}.xlsx`);
}
