import React, { useRef } from 'react';
import { X, Printer, FileText, Building2, User, Calendar, Tag } from 'lucide-react';
import { Quote } from '../db/db';

interface ViewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
}

export default function ViewQuoteModal({ isOpen, onClose, quote }: ViewQuoteModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quote) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React state bindings
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quote #{quote.id}</h2>
              <p className="text-xs text-slate-400">{new Date(quote.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              title="Print Quote"
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
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar bg-white text-slate-900" ref={printRef}>
          
          {/* Print Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">QUOTE</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Estimate for products & services</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-blue-600">Muskaan Electronics</h2>
              <p className="text-sm text-slate-600 mt-1">123 Tech Avenue, Nairobi, Kenya</p>
              <p className="text-sm text-slate-600">Tel: +254 700 000000</p>
              <p className="text-sm text-slate-600">Email: info@muskaanelectronics.com</p>
            </div>
          </div>

          {/* Quote Details */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quote To</p>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <User className="w-4 h-4 text-slate-400" />
                  {quote.customerName || 'Walk-in Customer'}
                </div>
              </div>
            </div>
            <div className="space-y-4 text-right">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quote Details</p>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <span className="text-slate-500">Quote #:</span> {quote.id}
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {new Date(quote.date).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <Tag className="w-4 h-4 text-slate-400" />
                  Status: <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    quote.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                    quote.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{quote.status}</span>
                </div>
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
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.items.map((item, index) => (
                  <tr key={index} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-slate-800">{item.name}</td>
                    <td className="py-4 px-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="py-4 px-4 text-sm text-slate-600 text-right">Ksh {item.price.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800 text-right">Ksh {item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="text-slate-800 font-bold">Ksh {quote.totalAmount.toLocaleString()}</span>
              </div>
              {/* Assuming no tax for now, or you can add it if needed */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-800">
                <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-blue-600">Ksh {quote.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="pt-8 border-t border-slate-200 mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes & Terms</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-12 text-center text-xs text-slate-400 font-medium">
            <p>This quote is valid for 30 days from the date of issue.</p>
            <p>Thank you for considering Muskaan Electronics!</p>
          </div>

        </div>
      </div>
    </div>
  );
}
