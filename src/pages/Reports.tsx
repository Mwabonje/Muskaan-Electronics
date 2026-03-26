import { useState, useMemo } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db } from "../db/db";
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  Download,
  Calendar,
  RotateCcw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { canViewActivity } from "../utils/permissions";

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("month"); // 'today', 'week', 'month', 'year', 'all'
  const [inventoryCategory, setInventoryCategory] = useState("All");
  const [inventoryStatus, setInventoryStatus] = useState("All");

  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const returns = useLiveQuery(() => db.returns.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const statuses = ["All", "In Stock", "Low Stock", "Out of Stock"];

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const cost = typeof p.cost === "number" ? p.cost : parseFloat((p.cost || 0).toString().replace(/[^0-9.-]+/g, "")) || 0;
      return sum + (cost * p.stock);
    }, 0);
  }, [products]);

  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchCat = inventoryCategory === "All" || p.category === inventoryCategory;
      const matchStatus = inventoryStatus === "All" || p.status === inventoryStatus;
      return matchCat && matchStatus;
    });
  }, [products, inventoryCategory, inventoryStatus]);

  // Filter data based on date range
  const filterByDate = (items: any[]) => {
    let filteredItems = items;
    if (dateRange !== "all") {
      const now = new Date();
      const start = new Date();

      switch (dateRange) {
        case "today":
          start.setHours(0, 0, 0, 0);
          break;
        case "week":
          start.setDate(now.getDate() - 7);
          break;
        case "month":
          start.setMonth(now.getMonth() - 1);
          break;
        case "year":
          start.setFullYear(now.getFullYear() - 1);
          break;
      }

      filteredItems = items.filter((item) => new Date(item.date) >= start);
    }
    
    return filteredItems.filter(item => canViewActivity(item.userId, user, users));
  };

  const filteredSales = filterByDate(sales);
  const filteredReturns = filterByDate(returns);

  // Calculate metrics
  const totalRevenue = filteredSales.reduce(
    (sum, sale) => sum + (sale.totalAmount - (sale.tax || 0)),
    0,
  );
  const totalRefunds = filteredReturns.reduce(
    (sum, ret) => sum + ret.totalRefund,
    0,
  );
  const netRevenue = totalRevenue - totalRefunds;

  const totalSalesCount = filteredSales.length;
  const totalReturnsCount = filteredReturns.length;

  const totalItemsSold = filteredSales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  // Calculate profit (assuming costPrice is available, otherwise this is just revenue)
  const totalProfit = filteredSales.reduce((sum, sale) => {
    const totalCost = sale.items.reduce((itemSum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const cost = product
        ? typeof product.cost === "number"
          ? product.cost
          : parseFloat((product.cost || 0).toString().replace(/[^0-9.-]+/g, "")) || 0
        : 0;
      return itemSum + cost * item.quantity;
    }, 0);
    const revenue = sale.totalAmount - (sale.tax || 0);
    return sum + (revenue - totalCost);
  }, 0) - filteredReturns.reduce((sum, ret) => {
    const totalCost = ret.items.reduce((itemSum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const cost = product
        ? typeof product.cost === "number"
          ? product.cost
          : parseFloat((product.cost || 0).toString().replace(/[^0-9.-]+/g, "")) || 0
        : 0;
      return itemSum + cost * item.quantity;
    }, 0);
    return sum + (ret.totalRefund - totalCost);
  }, 0);

  const formatPrice = (price: number) => {
    return `Ksh ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportReport = () => {
    const reportData = [
      ["Report Summary", `Date Range: ${dateRange}`],
      [""],
      ["Metric", "Value"],
      ["Total Revenue", formatPrice(totalRevenue)],
      ["Total Refunds", formatPrice(totalRefunds)],
      ["Net Revenue", formatPrice(netRevenue)],
      ["Estimated Profit", formatPrice(totalProfit)],
      ["Total Sales Transactions", totalSalesCount.toString()],
      ["Total Items Sold", totalItemsSold.toString()],
      ["Total Returns", totalReturnsCount.toString()],
    ];

    const csvContent = reportData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `business_report_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare data for Top Selling Products chart
  const topProductsData = useMemo(() => {
    const productSales: Record<
      number,
      { name: string; quantity: number; revenue: number }
    > = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.quantity * item.price;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5 products
  }, [filteredSales]);

  // Prepare data for Sales Trend chart
  const salesTrendData = useMemo(() => {
    const trend: Record<string, number> = {};

    // Initialize trend data based on dateRange
    const now = new Date();
    if (dateRange === "today") {
      for (let i = 0; i < 24; i++) {
        trend[`${i.toString().padStart(2, "0")}:00`] = 0;
      }
    } else if (dateRange === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        trend[d.toLocaleDateString("en-US", { weekday: "short" })] = 0;
      }
    } else if (dateRange === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        trend[
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        ] = 0;
      }
    } else if (dateRange === "year") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        trend[d.toLocaleDateString("en-US", { month: "short" })] = 0;
      }
    }

    filteredSales.forEach((sale) => {
      const d = new Date(sale.date);
      let key = "";
      if (dateRange === "today") {
        key = `${d.getHours().toString().padStart(2, "0")}:00`;
      } else if (dateRange === "week") {
        key = d.toLocaleDateString("en-US", { weekday: "short" });
      } else if (dateRange === "month") {
        key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else if (dateRange === "year") {
        key = d.toLocaleDateString("en-US", { month: "short" });
      } else {
        key = d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        if (trend[key] === undefined) trend[key] = 0;
      }

      if (trend[key] !== undefined) {
        trend[key] += (sale.totalAmount - (sale.tax || 0));
      }
    });

    return Object.entries(trend).map(([name, revenue]) => ({ name, revenue }));
  }, [filteredSales, dateRange]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" aria-hidden="true" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View business performance and generate reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Net Revenue</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatPrice(netRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Gross: {formatPrice(totalRevenue)}
          </p>
        </div>

        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">
              Estimated Profit
            </h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-500" aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatPrice(totalProfit)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Based on cost prices</p>
        </div>

        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Items Sold</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Package className="w-5 h-5 text-purple-500" aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{totalItemsSold}</p>
          <p className="text-xs text-slate-500 mt-2">
            Across {totalSalesCount} transactions
          </p>
        </div>

        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Refunds</h3>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <RotateCcw className="w-5 h-5 text-rose-500" aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatPrice(totalRefunds)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {totalReturnsCount} return transactions
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Top Selling Products (Revenue)
          </h3>
          <div className="h-64">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tickFormatter={(value) => `Ksh ${value}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      color: "#f8fafc",
                    }}
                    itemStyle={{ color: "#3b82f6" }}
                    formatter={(value: number) => [
                      `Ksh ${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Package className="w-8 h-8 mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">
                  No sales data available for this period.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sales Trend */}
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Sales Trend (Revenue)
          </h3>
          <div className="h-64">
            {salesTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesTrendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickFormatter={(value) => `Ksh ${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      color: "#f8fafc",
                    }}
                    itemStyle={{ color: "#10b981" }}
                    formatter={(value: number) => [
                      `Ksh ${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">
                  No sales trend data available for this period.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Report */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" aria-hidden="true" />
              Inventory Report
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Total Stock Value: <span className="text-white font-medium">{formatPrice(totalStockValue)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={inventoryCategory}
              onChange={(e) => setInventoryCategory(e.target.value)}
              className="px-3 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={inventoryStatus}
              onChange={(e) => setInventoryStatus(e.target.value)}
              className="px-3 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                <th className="pb-3 font-medium">Product Name</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium text-right">Stock</th>
                <th className="pb-3 font-medium text-right">Cost</th>
                <th className="pb-3 font-medium text-right">Value</th>
                <th className="pb-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((product) => {
                  const cost = typeof product.cost === "number" ? product.cost : parseFloat((product.cost || 0).toString().replace(/[^0-9.-]+/g, "")) || 0;
                  const value = cost * product.stock;
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3 text-slate-300">{product.name}</td>
                      <td className="py-3 text-slate-500">{product.category}</td>
                      <td className="py-3 text-right text-slate-300">{product.stock}</td>
                      <td className="py-3 text-right text-slate-500">{formatPrice(cost)}</td>
                      <td className="py-3 text-right text-slate-300">{formatPrice(value)}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            product.status === "In Stock"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : product.status === "Low Stock"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No products match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
