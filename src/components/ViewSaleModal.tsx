import React from 'react';
import { X, Printer, FileText, User, Calendar, CreditCard } from 'lucide-react';
import { Sale } from '../db/db';

interface ViewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export default function ViewSaleModal({ isOpen, onClose, sale }: ViewSaleModalProps) {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (priceStr: string | number | undefined | null) => {
    if (priceStr === undefined || priceStr === null) return `Ksh 0.00`;
    if (typeof priceStr === 'number') return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Receipt #S-{sale.id?.toString().padStart(4, '0')}</h2>
              <p className="text-xs text-slate-400">{new Date(sale.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              title="Print Receipt"
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
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar bg-white text-slate-900 print:overflow-visible print:p-4 font-mono text-sm">
          
          {/* Print Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">MUSKAAN ELECTRONICS</h1>
            <p className="text-slate-600 mt-1">123 Main Street, City</p>
            <p className="text-slate-600">Tel: +254 700 000 000</p>
            <p className="text-slate-600">PIN: P000000000A</p>
            <h2 className="text-lg font-bold mt-4">SALES RECEIPT</h2>
          </div>

          {/* Sale Details */}
          <div className="space-y-1 border-b border-slate-200 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt #:</span>
              <span className="font-medium">S-{sale.id?.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium">{new Date(sale.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium">{sale.customerName || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment:</span>
              <span className="font-medium">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-b border-slate-200 pb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left font-bold text-slate-600">Item</th>
                  <th className="py-2 text-center font-bold text-slate-600">Qty</th>
                  <th className="py-2 text-right font-bold text-slate-600">Price</th>
                  <th className="py-2 text-right font-bold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, index) => {
                  const total = item.quantity * item.price;
                  return (
                    <tr key={index}>
                      <td className="py-2 text-left">{item.name}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{formatPrice(item.price)}</td>
                      <td className="py-2 text-right">{formatPrice(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-1 border-b border-slate-200 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">{formatPrice(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{formatPrice(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold mt-2">
              <span>TOTAL:</span>
              <span>{formatPrice(sale.totalAmount)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="font-bold">Thank you for your business!</p>
            <p className="text-xs text-slate-500 mt-1">Goods once sold are not returnable</p>
          </div>

        </div>
      </div>
    </div>
  );
}
