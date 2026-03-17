import React, { useState } from "react";
import {
  X,
  Printer,
  FileText,
  Building2,
  Calendar,
  ClipboardList,
  CheckCircle,
  XCircle,
  Edit,
  AlertCircle,
} from "lucide-react";
import { db, LPO } from "../db/db";
import { useAuth } from "../context/AuthContext";

interface ViewLPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  lpo: LPO | null;
  onEdit?: (lpo: LPO) => void;
}

export default function ViewLPOModal({
  isOpen,
  onClose,
  lpo,
  onEdit,
}: ViewLPOModalProps) {
  const { role } = useAuth();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lpo) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (priceStr: string | number | undefined | null) => {
    if (priceStr == null) return "Ksh 0.00";
    if (typeof priceStr === "number")
      return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.toString().replace(/[^0-9.-]+/g, "")) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleApprove = async () => {
    try {
      await db.lpos.update(lpo.id!, { status: "Approved" });
      onClose();
    } catch (err) {
      console.error("Failed to approve LPO:", err);
      setError("Failed to approve LPO.");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    try {
      await db.lpos.update(lpo.id!, {
        status: "Rejected",
        notes: lpo.notes ? `${lpo.notes}\n\nRejection Reason: ${rejectionReason.trim()}` : `Rejection Reason: ${rejectionReason.trim()}`,
      });
      setIsRejecting(false);
      setRejectionReason("");
      onClose();
    } catch (err) {
      console.error("Failed to reject LPO:", err);
      setError("Failed to reject LPO.");
    }
  };

  const canApproveReject =
    (role === "Super Admin" || role === "Manager") && lpo.status === "Pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-3xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">
                  Purchase Order #LPO-{(lpo.id?.toString() || "").padStart(4, "0")}
                </h2>
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
              </div>
              <p className="text-xs text-slate-400">
                {new Date(lpo.date).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              title="Print LPO"
            >
              <Printer className="w-5 h-5" />
              <span className="text-sm font-bold hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Printable Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar bg-white text-slate-900 print:overflow-visible print:p-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-600 print:hidden">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {lpo.status === "Rejected" && lpo.notes && lpo.notes.includes("Rejection Reason:") && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 print:hidden">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">LPO Rejected</p>
                <p className="text-sm mt-1">{lpo.notes.split("Rejection Reason:")[1]?.trim()}</p>
              </div>
            </div>
          )}

          {/* Print Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                PURCHASE ORDER
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Local Purchase Order (LPO)
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-blue-600">
                MUSKAAN ELECTRONICS
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                123 Main Street, City
              </p>
              <p className="text-sm text-slate-600">Tel: +254 700 000 000</p>
            </div>
          </div>

          {/* LPO Details */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  To (Supplier)
                </p>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {lpo.supplierName}
                </div>
              </div>
            </div>
            <div className="space-y-4 text-right">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Order Details
                </p>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <span className="text-slate-500">LPO #:</span> LPO-
                  {(lpo.id?.toString() || "").padStart(4, "0")}
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Date: {new Date(lpo.date).toLocaleDateString()}
                </div>
                {lpo.expectedDeliveryDate && (
                  <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                    <span className="text-slate-500">Expected Delivery:</span>{" "}
                    {new Date(lpo.expectedDeliveryDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Item Description
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Qty
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Unit Cost
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lpo.items.map((item, index) => {
                  const unitCost =
                    typeof item.unitCost === "number"
                      ? item.unitCost
                      : parseFloat(
                          (item.unitCost || "0").toString().replace(/[^0-9.-]+/g, ""),
                        ) || 0;
                  const total = item.quantity * unitCost;
                  return (
                    <tr
                      key={index}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-4 text-sm font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-right">
                        {formatPrice(unitCost)}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-800 text-right">
                        {formatPrice(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td
                    colSpan={3}
                    className="py-4 px-4 text-sm font-bold text-slate-800 text-right uppercase tracking-wider"
                  >
                    Total Amount
                  </td>
                  <td className="py-4 px-4 text-lg font-black text-blue-600 text-right">
                    {formatPrice(lpo.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {lpo.notes && (
            <div className="pt-8 border-t border-slate-200 mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Notes & Instructions
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {lpo.notes}
              </p>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">
                Authorized By (Signature)
              </p>
              <div className="border-b border-slate-300 w-full"></div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">
                Supplier Acceptance (Signature)
              </p>
              <div className="border-b border-slate-300 w-full"></div>
            </div>
          </div>
        </div>

        {/* Action Footer for Approvals / Edits */}
        <div className="p-5 border-t border-slate-800 bg-[#0f172a] print:hidden">
          {isRejecting ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full mt-2 bg-[#1e293b] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none min-h-[80px]"
                  placeholder="Explain why this LPO is being rejected..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsRejecting(false);
                    setRejectionReason("");
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Confirm Rejection
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              {lpo.status === "Rejected" && onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(lpo);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit & Resubmit
                </button>
              )}
              {canApproveReject && (
                <>
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 border border-rose-500/20"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
