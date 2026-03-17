import { useState } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, Sale } from "../db/db";
import {
  Search,
  Filter,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import ViewSaleModal from "../components/ViewSaleModal";
import { useAuth } from "../context/AuthContext";
import { canViewActivity } from "../utils/permissions";

export default function SalesHistory() {
  const { user } = useAuth();
  const sales = useLiveQuery(() => db.sales.reverse().toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const itemsPerPage = 15;

  const filteredSales = sales.filter((sale) => {
    if (!canViewActivity(sale.userId, user, users)) return false;

    const matchesSearch =
      sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.id?.toString() || "").includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const formatPrice = (priceStr: string | number | undefined | null) => {
    if (priceStr == null) return "Ksh 0.00";
    if (typeof priceStr === "number")
      return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.toString().replace(/[^0-9.-]+/g, "")) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportCSV = () => {
    if (!filteredSales || filteredSales.length === 0) return;

    const headers = [
      "Sale ID",
      "Date",
      "Customer Name",
      "Payment Method",
      "Total Amount",
      "Items Count",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredSales.map((s) =>
        [
          `"S-${(s.id?.toString() || "").padStart(4, "0")}"`,
          `"${new Date(s.date).toLocaleDateString()}"`,
          `"${s.customerName || "Walk-in Customer"}"`,
          `"${s.paymentMethod}"`,
          s.totalAmount,
          s.items.length,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `sales_history_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Sales History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View and manage past sales transactions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer name or sale ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sale ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-[#1e293b]/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">
                      S-{(sale.id?.toString() || "").padStart(4, "0")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300">
                      {new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(sale.date).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-300">
                      {sale.customerName || "Walk-in Customer"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.paymentMethod === "Cash"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">
                      {formatPrice(sale.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedSale(sale);
                        setIsViewModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="View Receipt"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedSales.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No sales found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0f172a]/50 px-6 py-4">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-300">
              {filteredSales.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-300">
              {Math.min(currentPage * itemsPerPage, filteredSales.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-300">
              {filteredSales.length}
            </span>{" "}
            results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ViewSaleModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        sale={selectedSale}
      />
    </div>
  );
}
