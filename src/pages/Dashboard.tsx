import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  ShoppingBag,
  PieChart,
  AlertTriangle,
  Filter,
  Download,
  ShoppingCart,
  ClipboardList,
  Truck,
  RotateCcw,
  ChevronRight,
  History,
  List,
  FileText,
} from "lucide-react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db } from "../db/db";
import NewSaleModal from "../components/NewSaleModal";
import NewQuoteModal from "../components/NewQuoteModal";
import CreateLPOModal from "../components/CreateLPOModal";
import LogDeliveryModal from "../components/LogDeliveryModal";
import CustomerReturnModal from "../components/CustomerReturnModal";
import ViewAllActivityModal from "../components/ViewAllActivityModal";

import { useAuth } from "../context/AuthContext";
import { canViewActivity } from "../utils/permissions";
import { getSystemSetting } from "../utils/settings";

export default function Dashboard() {
  const { role, user } = useAuth();
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [isCreateLPOModalOpen, setIsCreateLPOModalOpen] = useState(false);
  const [isLogDeliveryModalOpen, setIsLogDeliveryModalOpen] = useState(false);
  const [isCustomerReturnModalOpen, setIsCustomerReturnModalOpen] =
    useState(false);
  const [isViewAllActivityModalOpen, setIsViewAllActivityModalOpen] = useState(false);
  const [quotesEnabled, setQuotesEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkQuotesEnabled = async () => {
      const enabled = await getSystemSetting("quotes_enabled_for_cashier");
      if (isMounted) {
        setQuotesEnabled(enabled !== "false");
      }
    };

    checkQuotesEnabled();
    const interval = setInterval(checkQuotesEnabled, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const productsCount = useLiveQuery(() => db.products.count(), []) || 0;
  const lowStockCount =
    useLiveQuery(
      () => db.products.where("status").equals("Low Stock").count(),
      [],
    ) || 0;
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysSales =
    useLiveQuery(
      () => db.sales.filter((sale) => new Date(sale.date) >= today && canViewActivity(sale.userId, user, users)).toArray(),
      [user, users],
    ) || [];

  const todaysReturns =
    useLiveQuery(
      () => db.returns.filter((ret) => new Date(ret.date) >= today && canViewActivity(ret.userId, user, users)).toArray(),
      [user, users],
    ) || [];

  const todaysRevenue = todaysSales.reduce(
    (sum, sale) => sum + (sale.totalAmount - (sale.tax || 0)),
    0,
  ) - todaysReturns.reduce((sum, ret) => sum + ret.totalRefund, 0);

  const todaysProfit = todaysSales.reduce((sum, sale) => {
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
  }, 0) - todaysReturns.reduce((sum, ret) => {
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

  const totalInventoryValue = products.reduce((sum, product) => {
    const cost =
      typeof product.cost === "number"
        ? product.cost
        : parseFloat((product.cost || 0).toString().replace(/[^0-9.-]+/g, "")) || 0;
    return sum + cost * product.stock;
  }, 0);

  const recentSales = useLiveQuery(() => db.sales.reverse().toArray().then(arr => arr.filter(s => canViewActivity(s.userId, user, users)).slice(0, 5)), [user, users]) || [];
  const recentLPOs = useLiveQuery(() => db.lpos.reverse().toArray().then(arr => arr.filter(l => canViewActivity(l.userId, user, users)).slice(0, 5)), [user, users]) || [];
  const recentDeliveries = useLiveQuery(() => db.deliveries.reverse().toArray().then(arr => arr.filter(d => canViewActivity(d.userId, user, users)).slice(0, 5)), [user, users]) || [];

  const clearMessages = useLiveQuery(() => db.messages.where("subject").equals("CLEAR_ACTIVITY").reverse().sortBy("id"), []) || [];
  const clearedAt = clearMessages.length > 0 ? new Date(clearMessages[0].content).getTime() : 0;

  const recentActivities = [...recentSales.map(s => ({ ...s, type: 'Sale' })), 
                            ...recentLPOs.map(l => ({ ...l, type: 'LPO' })),
                            ...recentDeliveries.map(d => ({ ...d, type: 'Delivery' }))]
    .filter(a => new Date(a.date).getTime() > clearedAt)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleClearActivity = async () => {
    if (!user) return;
    try {
      await db.messages.add({
        senderId: user.id!,
        senderName: user.name,
        senderRole: user.role,
        receiverId: "system",
        subject: "CLEAR_ACTIVITY",
        content: new Date().toISOString(),
        date: new Date().toISOString(),
        read: true,
        type: "system"
      });
    } catch (error) {
      console.error("Failed to clear activity:", error);
    }
  };

  const formatPrice = (priceStr: string | number | undefined | null) => {
    if (priceStr == null) return "Ksh 0.00";
    if (typeof priceStr === "number")
      return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.toString().replace(/[^0-9.-]+/g, "")) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [inventoryFilter, setInventoryFilter] = useState("All");

  const filteredProducts = products.filter((p) => {
    if (inventoryFilter === "All") return true;
    return p.status === inventoryFilter;
  });

  const handleExportCSV = () => {
    if (!filteredProducts || filteredProducts.length === 0) return;

    const headers = [
      "Item Name",
      "Category",
      "Stock Level",
      "Unit",
      "Status",
      "Cost",
      "Selling",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredProducts.map((p) =>
        [
          `"${p.name}"`,
          `"${p.category}"`,
          p.stock,
          '"Pcs"',
          `"${p.status}"`,
          p.cost,
          p.selling,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inventory_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#0f172a] min-h-full text-slate-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">
              Total Inventory Value
            </p>
            <div className="p-1.5 bg-blue-900/30 rounded-lg text-blue-500">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white mb-1">
              {formatPrice(totalInventoryValue)}
            </p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
              <TrendingUpIcon className="w-3 h-3" /> Based on cost price
            </p>
          </div>
        </div>

        <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">
              Today's Revenue
            </p>
            <div className="p-1.5 bg-purple-900/30 rounded-lg text-purple-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white mb-1">
              {formatPrice(todaysRevenue)}
            </p>
            <p className="text-[10px] font-bold text-purple-500 uppercase">
              {todaysSales.length} Transactions
            </p>
          </div>
        </div>

        <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">
              Today's Profit
            </p>
            <div className="p-1.5 bg-teal-900/30 rounded-lg text-teal-500">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white mb-1">
              {formatPrice(todaysProfit)}
            </p>
            <p className="text-[10px] font-bold text-teal-500 uppercase">
              Net Income (Est)
            </p>
          </div>
        </div>

        <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
          <AlertTriangle className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-800/50" />
          <div className="flex justify-between items-start relative z-10">
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">
              Low Stock Items
            </p>
            <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-2xl font-bold text-white mb-1">
              {lowStockCount} Items
            </p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase">
              All Stocked Up
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Inventory Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-bold text-white">
                Inventory Overview
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1e293b] border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors outline-none"
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1e293b] border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-[#0B1120] rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Item Name
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Category
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Stock Level
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-slate-500"
                      >
                        No items found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.slice(0, 5).map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          Pcs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full whitespace-nowrap ${
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
                        <td className="px-6 py-4 text-sm text-slate-300 text-right whitespace-nowrap">
                          {formatPrice(product.selling)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Quick Actions & Recent Activity */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-yellow-500">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Quick Actions</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setIsNewSaleModalOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/50 rounded-lg text-white">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">New Sale</p>
                    <p className="text-[10px] text-blue-200">
                      Record customer transaction
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
              </button>

              {!(role === "Cashier" && !quotesEnabled) && (
                <button
                  onClick={() => setIsNewQuoteModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 bg-[#0B1120] hover:bg-[#1e293b] border border-slate-800 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">New Quote</p>
                      <p className="text-[10px] text-slate-500">
                        Generate estimate for clients
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </button>
              )}

              <button
                onClick={() => setIsCreateLPOModalOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-[#0B1120] hover:bg-[#1e293b] border border-slate-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-800 rounded-lg text-purple-400">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Create LPO</p>
                    <p className="text-[10px] text-slate-500">
                      Order stock from suppliers
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setIsLogDeliveryModalOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-[#0B1120] hover:bg-[#1e293b] border border-slate-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Log Delivery</p>
                    <p className="text-[10px] text-slate-500">
                      Restock inventory items
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setIsCustomerReturnModalOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-[#0B1120] hover:bg-[#1e293b] border border-slate-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-800 rounded-lg text-amber-500">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">
                      Customer Return
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Refund or exchange items
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-white">Recent Activity</h2>
              </div>
              <div className="flex items-center gap-2">
                {(role === "Super Admin" || role === "Admin" || role === "Manager") && recentActivities.length > 0 && (
                  <button
                    onClick={handleClearActivity}
                    className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-400/10 transition-colors"
                  >
                    Clear
                  </button>
                )}
                {(role === "Super Admin" || role === "Admin" || role === "Manager") && (
                  <button
                    onClick={() => setIsViewAllActivityModalOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-400/10 transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-800/50">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <div key={index} className="p-4 hover:bg-[#1e293b]/50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          activity.type === 'Sale' ? 'bg-emerald-500/10 text-emerald-400' :
                          activity.type === 'LPO' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {activity.type === 'Sale' && <ShoppingCart className="w-4 h-4" />}
                          {activity.type === 'LPO' && <FileText className="w-4 h-4" />}
                          {activity.type === 'Delivery' && <Truck className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {activity.type === 'Sale' ? `Sale #${activity.id ? activity.id.toString().padStart(4, '0') : '0000'}` :
                             activity.type === 'LPO' ? `LPO #${activity.id ? activity.id.toString().padStart(4, '0') : '0000'}` :
                             `Delivery #${activity.id ? activity.id.toString().padStart(4, '0') : '0000'}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(activity.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {activity.type !== 'Delivery' && (
                          <p className="text-sm font-bold text-white">
                            {formatPrice((activity as any).totalAmount)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400">
                          {activity.type === 'Sale' ? (activity as any).customerName || 'Walk-in' :
                           activity.type === 'LPO' ? (activity as any).supplierName :
                           (activity as any).supplierName}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No recent activities found.
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/sales"
              className="w-full flex justify-center py-4 bg-[#0B1120] border border-slate-800 hover:bg-[#1e293b] rounded-xl text-xs font-bold text-blue-500 tracking-wider uppercase transition-colors"
            >
              View All Transactions
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewSaleModal
        isOpen={isNewSaleModalOpen}
        onClose={() => setIsNewSaleModalOpen(false)}
      />
      <NewQuoteModal
        isOpen={isNewQuoteModalOpen}
        onClose={() => setIsNewQuoteModalOpen(false)}
      />
      <CreateLPOModal
        isOpen={isCreateLPOModalOpen}
        onClose={() => setIsCreateLPOModalOpen(false)}
      />
      <LogDeliveryModal
        isOpen={isLogDeliveryModalOpen}
        onClose={() => setIsLogDeliveryModalOpen(false)}
      />
      <CustomerReturnModal
        isOpen={isCustomerReturnModalOpen}
        onClose={() => setIsCustomerReturnModalOpen(false)}
      />
      <ViewAllActivityModal
        isOpen={isViewAllActivityModalOpen}
        onClose={() => setIsViewAllActivityModalOpen(false)}
      />
    </div>
  );
}

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
