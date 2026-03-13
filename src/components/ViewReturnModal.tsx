import React from 'react';
import { X, Printer, FileText, User, Calendar, RotateCcw } from 'lucide-react';
import { CustomerReturn } from '../db/db';

interface ViewReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerReturn: CustomerReturn | null;
}

export default function ViewReturnModal({ isOpen, onClose, customerReturn }: ViewReturnModalProps) {
  if (!isOpen || !customerReturn) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (priceStr: string | number) => {
    if (typeof priceStr === 'number') return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Return Note #RET-{customerReturn.id?.toString().padStart(4, '0')}</h2>
              <p className="text-xs text-slate-400">{new Date(customerReturn.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              title="Print Return Note"
            >
              <Printer className="w-5 h-5" />
              <span className="text-sm font-bold hidden sm:inline">Print</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Printable Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar bg-white text-slate-900 print:overflow-visible print:p-4">
          
          {/* Print Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">RETURN NOTE</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Customer Goods Return</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-blue-600">HARDWARE STORE</h2>
              <p className="text-sm text-slate-600 mt-1">123 Main Street, City</p>
              <p className="text-sm text-slate-600">Tel: +254 700 000 000</p>
            </div>
          </div>

          {/* Return Details */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <User className="w-4 h-4 text-slate-400" />
                  {customerReturn.customerName}
                </div>
              </div>
            </div>
            <div className="space-y-4 text-right">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Return Details</p>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <span className="text-slate-500">Return #:</span> RET-{customerReturn.id?.toString().padStart(4, '0')}
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Date: {new Date(customerReturn.date).toLocaleDateString()}
                </div>
                {customerReturn.originalSaleId && (
                  <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                    <span className="text-slate-500">Original Sale #:</span> S-{customerReturn.originalSaleId.toString().padStart(4, '0')}
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
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Description</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Condition</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerReturn.items.map((item, index) => {
                  const refundAmount = parseFloat(item.refundAmount.toString().replace(/[^0-9.-]+/g, '')) || 0;
                  return (
                    <tr key={index} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-slate-800">{item.name}</td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.condition === 'Good' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-800 text-right">{formatPrice(refundAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-4 px-4 text-sm font-bold text-slate-800 text-right uppercase tracking-wider">Total Refund</td>
                  <td className="py-4 px-4 text-lg font-black text-blue-600 text-right">{formatPrice(customerReturn.totalRefund)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Reason */}
          {customerReturn.reason && (
            <div className="pt-8 border-t border-slate-200 mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reason for Return</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{customerReturn.reason}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Authorized By (Signature)</p>
              <div className="border-b border-slate-300 w-full"></div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Customer Acceptance (Signature)</p>
              <div className="border-b border-slate-300 w-full"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
