import { useState } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, Delivery } from "../db/db";
import {
  Search,
  Download,
  Truck,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import ViewDeliveryModal from "../components/ViewDeliveryModal";

export default function Deliveries() {
  const deliveries =
    useLiveQuery(() => db.deliveries.reverse().toArray(), []) || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const itemsPerPage = 15;

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.supplierName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (delivery.id?.toString() || "").includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleExportCSV = () => {
    if (!filteredDeliveries || filteredDeliveries.length === 0) return;

    const headers = [
      "Delivery ID",
      "Date",
      "Supplier Name",
      "LPO Number",
      "Items Count",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredDeliveries.map((d) =>
        [
          `"D-${(d.id?.toString() || "").padStart(4, "0")}"`,
          `"${new Date(d.date).toLocaleDateString()}"`,
          `"${d.supplierName}"`,
          `"${d.lpoNumber || "N/A"}"`,
          d.items.length,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `deliveries_history_${new Date().toISOString().split("T")[0]}.csv`,
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
            <Truck className="w-6 h-6 text-blue-500" />
            Deliveries
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and manage incoming inventory deliveries
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
            placeholder="Search by supplier name or delivery ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Delivery ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  LPO Number
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
              {paginatedDeliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="hover:bg-[#1e293b]/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">
                      D-{(delivery.id?.toString() || "").padStart(4, "0")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300">
                      {new Date(delivery.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-300">
                      {delivery.supplierName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400">
                      {delivery.lpoNumber || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">
                      {delivery.items.length} items
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setIsViewModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="View Delivery Note"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedDeliveries.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No deliveries found matching your criteria.
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
              {filteredDeliveries.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-300">
              {Math.min(currentPage * itemsPerPage, filteredDeliveries.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-300">
              {filteredDeliveries.length}
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

      <ViewDeliveryModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        delivery={selectedDelivery}
      />
    </div>
  );
}
