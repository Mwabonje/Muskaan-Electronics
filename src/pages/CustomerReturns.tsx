import { useState } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, CustomerReturn } from "../db/db";
import {
  Search,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
} from "lucide-react";
import ViewReturnModal from "../components/ViewReturnModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import { canViewActivity } from "../utils/permissions";

export default function CustomerReturns() {
  const { user, role } = useAuth();
  const returns = useLiveQuery(() => db.returns.reverse().toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<CustomerReturn | null>(
    null,
  );
  const [returnToDelete, setReturnToDelete] = useState<CustomerReturn | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const itemsPerPage = 15;

  const handleDeleteReturn = async () => {
    if (!returnToDelete?.id) return;
    try {
      // If the condition was "Good", the stock was increased. We need to decrease it back.
      if (returnToDelete.condition === "Good") {
        for (const item of returnToDelete.items) {
          if (item.productId) {
            const productInDb = await db.products.get(item.productId);
            if (productInDb) {
              const newStock = Math.max(0, productInDb.stock - item.quantity);
              const status =
                newStock === 0
                  ? "Out of Stock"
                  : newStock <= (productInDb.minStock || 5)
                    ? "Low Stock"
                    : "In Stock";
              
              await db.products.update(productInDb.id!, { stock: newStock, status });

              // Add stock history record
              await db.stockHistory.add({
                productId: productInDb.id!,
                changeType: "Deduction",
                quantityChange: item.quantity,
                previousStock: productInDb.stock,
                newStock: newStock,
                date: new Date().toISOString(),
                reason: `Return RET-${returnToDelete.id.toString().padStart(4, "0")} deleted`,
                userId: user?.id,
              });
            }
          }
        }
      }

      // Delete the return record
      await db.returns.delete(returnToDelete.id);
      setReturnToDelete(null);
    } catch (error) {
      console.error("Failed to delete return:", error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await db.returns.clear();
      setIsClearModalOpen(false);
    } catch (error) {
      console.error("Failed to clear returns history:", error);
    }
  };

  const filteredReturns = returns.filter((ret) => {
    if (!canViewActivity(ret.userId, user, users)) return false;

    const matchesSearch =
      ret.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ret.id?.toString() || "").includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const paginatedReturns = filteredReturns.slice(
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
    if (!filteredReturns || filteredReturns.length === 0) return;

    const headers = [
      "Return ID",
      "Date",
      "Customer Name",
      "Original Sale ID",
      "Total Refund",
      "Items Count",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredReturns.map((r) =>
        [
          `"RET-${(r.id?.toString() || "").padStart(4, "0")}"`,
          `"${new Date(r.date).toLocaleDateString()}"`,
          `"${r.customerName}"`,
          `"${r.originalSaleId || "N/A"}"`,
          r.totalRefund,
          r.items.length,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `returns_history_${new Date().toISOString().split("T")[0]}.csv`,
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
            <RotateCcw className="w-6 h-6 text-blue-500" />
            Customer Returns
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and track customer returns and refunds
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(role === "Super Admin" || role === "Admin" || role === "Manager") && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg border border-rose-500/20 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          )}
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
            placeholder="Search by customer name or return ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Return ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Original Sale
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Refund
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedReturns.map((ret) => (
                <tr
                  key={ret.id}
                  className="hover:bg-[#1e293b]/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">
                      RET-{(ret.id?.toString() || "").padStart(4, "0")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300">
                      {new Date(ret.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-300">
                      {ret.customerName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400">
                      {ret.originalSaleId
                        ? `S-${ret.originalSaleId.toString().padStart(4, "0")}`
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">
                      {formatPrice(ret.totalRefund)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedReturn(ret);
                          setIsViewModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="View Return Note"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(role === "Super Admin" || role === "Admin" || role === "Manager") && (
                        <button
                          onClick={() => setReturnToDelete(ret)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                          title="Delete Return"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedReturns.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No returns found matching your criteria.
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
              {filteredReturns.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-300">
              {Math.min(currentPage * itemsPerPage, filteredReturns.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-300">
              {filteredReturns.length}
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

      <ViewReturnModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        customerReturn={selectedReturn}
      />

      <ConfirmModal
        isOpen={!!returnToDelete}
        title="Delete Return"
        message="Are you sure you want to delete this return? This action cannot be undone. If the returned items were in 'Good' condition, their stock will be deducted from inventory."
        confirmText="Delete Return"
        cancelText="Cancel"
        onConfirm={handleDeleteReturn}
        onCancel={() => setReturnToDelete(null)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear Returns History"
        message="Are you sure you want to delete ALL returns history? This action cannot be undone and will permanently remove all return records. Note: This will NOT adjust inventory stock."
        confirmText="Clear All Returns"
        cancelText="Cancel"
        onConfirm={handleClearHistory}
        onCancel={() => setIsClearModalOpen(false)}
        isDestructive={true}
      />
    </div>
  );
}
