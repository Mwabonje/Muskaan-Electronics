import { useState } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, LPO } from "../db/db";
import {
  Search,
  Download,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import ViewLPOModal from "../components/ViewLPOModal";
import CreateLPOModal from "../components/CreateLPOModal";
import { useAuth } from "../context/AuthContext";

export default function PurchaseOrders() {
  const { role } = useAuth();
  const lpos = useLiveQuery(() => db.lpos.reverse().toArray(), []) || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLPO, setSelectedLPO] = useState<LPO | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [lpoToEdit, setLpoToEdit] = useState<LPO | null>(null);
  const itemsPerPage = 15;

  const filteredLPOs = lpos.filter((lpo) => {
    const matchesSearch =
      lpo.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lpo.id?.toString().includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredLPOs.length / itemsPerPage);
  const paginatedLPOs = filteredLPOs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const formatPrice = (priceStr: string | number) => {
    if (typeof priceStr === "number")
      return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.replace(/[^0-9.-]+/g, "")) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportCSV = () => {
    if (!filteredLPOs || filteredLPOs.length === 0) return;

    const headers = [
      "LPO ID",
      "Date",
      "Supplier Name",
      "Total Amount",
      "Status",
      "Items Count",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredLPOs.map((l) =>
        [
          `"LPO-${l.id?.toString().padStart(4, "0")}"`,
          `"${new Date(l.date).toLocaleDateString()}"`,
          `"${l.supplierName}"`,
          l.totalAmount,
          `"${l.status}"`,
          l.items.length,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `lpos_history_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditLPO = (lpo: LPO) => {
    setLpoToEdit(lpo);
    setIsCreateModalOpen(true);
  };

  const handleDeleteLPO = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this LPO?")) {
      try {
        await db.lpos.delete(id);
      } catch (error) {
        console.error("Failed to delete LPO:", error);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage purchase orders and supplier requests
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
          <button
            onClick={() => {
              setLpoToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-purple-900/20"
          >
            <Plus className="w-4 h-4" />
            New LPO
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by supplier name or LPO ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* LPOs List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  LPO ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedLPOs.map((lpo) => (
                <tr
                  key={lpo.id}
                  className="hover:bg-[#1e293b]/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">
                      LPO-{lpo.id?.toString().padStart(4, "0")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300">
                      {new Date(lpo.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-300">
                      {lpo.supplierName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">
                      {formatPrice(lpo.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        lpo.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : lpo.status === "Rejected"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : lpo.status === "Delivered"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : lpo.status === "Cancelled"
                                ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {lpo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-400">
                      {lpo.items.length} items
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLPO(lpo);
                          setIsViewModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="View LPO"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(role === "Admin" || role === "Super Admin") && (
                        <>
                          <button
                            onClick={() => handleEditLPO(lpo)}
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                            title="Edit LPO"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLPO(lpo.id!)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                            title="Delete LPO"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLPOs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No purchase orders found matching your criteria.
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
              {filteredLPOs.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-300">
              {Math.min(currentPage * itemsPerPage, filteredLPOs.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-300">
              {filteredLPOs.length}
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

      <ViewLPOModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        lpo={selectedLPO}
        onEdit={handleEditLPO}
      />

      <CreateLPOModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        lpoToEdit={lpoToEdit}
      />
    </div>
  );
}
