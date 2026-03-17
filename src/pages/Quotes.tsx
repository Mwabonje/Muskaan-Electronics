import { useState } from "react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, Quote } from "../db/db";
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import ViewQuoteModal from "../components/ViewQuoteModal";
import NewQuoteModal from "../components/NewQuoteModal";
import { useAuth } from "../context/AuthContext";

export default function Quotes() {
  const { role } = useAuth();
  const quotes = useLiveQuery(() => db.quotes.reverse().toArray(), []) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredQuotes = quotes.filter((quote) => {
    if (role === "Cashier" && quote.isVisibleToCashier === false) {
      return false;
    }

    const matchesSearch =
      quote.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.id?.toString() || "").includes(searchTerm);

    const matchesStatus =
      statusFilter === "All" || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    id: number,
    newStatus: "Pending" | "Accepted" | "Rejected",
  ) => {
    try {
      await db.quotes.update(id, { status: newStatus });
    } catch (error) {
      console.error("Failed to update quote status:", error);
    }
  };

  const handleExportCSV = () => {
    if (!filteredQuotes || filteredQuotes.length === 0) return;

    const headers = [
      "Quote ID",
      "Date",
      "Customer Name",
      "Status",
      "Total Amount",
      "Items Count",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredQuotes.map((q) =>
        [
          `"Q-${(q.id?.toString() || "").padStart(4, "0")}"`,
          `"${new Date(q.date).toLocaleDateString()}"`,
          `"${q.customerName}"`,
          `"${q.status}"`,
          q.totalAmount,
          q.items.length,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `quotes_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditQuote = (quote: Quote) => {
    setQuoteToEdit(quote);
    setIsEditModalOpen(true);
  };

  const handleDeleteQuote = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this quote?")) {
      try {
        await db.quotes.delete(id);
      } catch (error) {
        console.error("Failed to delete quote:", error);
      }
    }
  };

  const handleToggleVisibility = async (quote: Quote) => {
    try {
      await db.quotes.update(quote.id!, {
        isVisibleToCashier: quote.isVisibleToCashier === false ? true : false,
      });
    } catch (error) {
      console.error("Failed to update quote visibility:", error);
    }
  };

  const [quotesEnabled, setQuotesEnabled] = useState(
    localStorage.getItem("quotes_enabled_for_cashier") !== "false"
  );

  const handleToggleQuotesAccess = () => {
    const newValue = !quotesEnabled;
    setQuotesEnabled(newValue);
    localStorage.setItem("quotes_enabled_for_cashier", String(newValue));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Quotes & Estimates
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and track customer quotes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(role === "Admin" || role === "Super Admin") && (
            <button
              onClick={handleToggleQuotesAccess}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border ${
                quotesEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              }`}
              title={quotesEnabled ? "Disable Quotes for Cashiers" : "Enable Quotes for Cashiers"}
            >
              {quotesEnabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              Cashier Access: {quotesEnabled ? "ON" : "OFF"}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              setQuoteToEdit(null);
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer name or quote ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#0B1120] border border-slate-800 rounded-xl p-1">
          {["All", "Pending", "Accepted", "Rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Quote ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-base font-medium text-slate-400">
                      No quotes found
                    </p>
                    <p className="text-sm mt-1">
                      Generate a new quote from the Dashboard.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-[#0f172a]/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-blue-400">
                        #{quote.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {new Date(quote.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(quote.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-200">
                        {quote.customerName || "Walk-in Customer"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">
                        Ksh {quote.totalAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {quote.status === "Pending" && (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        {quote.status === "Accepted" && (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                        {quote.status === "Rejected" && (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <select
                          value={quote.status}
                          onChange={(e) =>
                            handleStatusChange(quote.id!, e.target.value as any)
                          }
                          className={`text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer ${
                            quote.status === "Pending"
                              ? "text-amber-500"
                              : quote.status === "Accepted"
                                ? "text-emerald-500"
                                : "text-rose-500"
                          }`}
                        >
                          <option
                            value="Pending"
                            className="bg-slate-900 text-amber-500"
                          >
                            Pending
                          </option>
                          <option
                            value="Accepted"
                            className="bg-slate-900 text-emerald-500"
                          >
                            Accepted
                          </option>
                          <option
                            value="Rejected"
                            className="bg-slate-900 text-rose-500"
                          >
                            Rejected
                          </option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedQuote(quote)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            View
                          </span>
                        </button>
                        {(role === "Admin" || role === "Super Admin" || role === "Manager") && (
                          <>
                            <button
                              onClick={() => handleToggleVisibility(quote)}
                              className={`p-2 rounded-lg transition-colors ${
                                quote.isVisibleToCashier === false
                                  ? "text-rose-400 hover:bg-rose-400/10"
                                  : "text-emerald-400 hover:bg-emerald-400/10"
                              }`}
                              title={
                                quote.isVisibleToCashier === false
                                  ? "Hidden from Cashier (Click to show)"
                                  : "Visible to Cashier (Click to hide)"
                              }
                            >
                              {quote.isVisibleToCashier === false ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditQuote(quote)}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                              title="Edit Quote"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuote(quote.id!)}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                              title="Delete Quote"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <ViewQuoteModal
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        quote={selectedQuote}
      />

      {/* Edit Modal */}
      <NewQuoteModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setQuoteToEdit(null);
        }}
        quoteToEdit={quoteToEdit}
      />
    </div>
  );
}
