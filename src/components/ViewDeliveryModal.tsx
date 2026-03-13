import React from 'react';
import { X, Printer, FileText, Building2, User, Calendar, Truck } from 'lucide-react';
import { Delivery } from '../db/db';

interface ViewDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
}

export default function ViewDeliveryModal({ isOpen, onClose, delivery }: ViewDeliveryModalProps) {
  if (!isOpen || !delivery) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Delivery Note #D-{delivery.id?.toString().padStart(4, '0')}</h2>
              <p className="text-xs text-slate-400">{new Date(delivery.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              title="Print Delivery Note"
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
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">DELIVERY NOTE</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Goods Received Note</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-blue-600">MUSKAAN ELECTRONICS</h2>
              <p className="text-sm text-slate-600 mt-1">123 Main Street, City</p>
              <p className="text-sm text-slate-600">Tel: +254 700 000 000</p>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier</p>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {delivery.supplierName}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Received By</p>
                <div className="flex flex-col text-slate-800 font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {delivery.receivedBy}
                  </div>
                  {delivery.receivedTime && <span className="text-xs text-slate-500 ml-6">at {delivery.receivedTime}</span>}
                </div>
              </div>
              {(delivery.driverName || delivery.plateNumber) && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transport Details</p>
                  <div className="flex flex-col text-slate-800 font-medium">
                    {delivery.driverName && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        Driver: {delivery.driverName}
                      </div>
                    )}
                    {delivery.plateNumber && (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">PL</span>
                        Plate: {delivery.plateNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4 text-right">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Details</p>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <span className="text-slate-500">Delivery #:</span> D-{delivery.id?.toString().padStart(4, '0')}
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Date: {new Date(delivery.date).toLocaleDateString()}
                </div>
                {delivery.purchaseOrderIds && delivery.purchaseOrderIds.length > 0 && (
                  <div className="flex items-center justify-end gap-2 text-slate-800 font-medium flex-wrap">
                    <span className="text-slate-500">LPOs:</span>
                    {delivery.purchaseOrderIds.map(id => (
                      <span key={id} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">LPO-{id.toString().padStart(4, '0')}</span>
                    ))}
                  </div>
                )}
                {!delivery.purchaseOrderIds && delivery.purchaseOrderId && (
                  <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                    <span className="text-slate-500">LPO #:</span> LPO-{delivery.purchaseOrderId.toString().padStart(4, '0')}
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
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {delivery.items.map((item, index) => (
                  <tr key={index} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-slate-800">{item.name}</td>
                    <td className="py-4 px-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {delivery.notes && (
            <div className="pt-8 border-t border-slate-200 mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes & Remarks</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{delivery.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Delivered By (Signature)</p>
              <div className="border-b border-slate-300 w-full"></div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Received By (Signature)</p>
              <div className="border-b border-slate-300 w-full"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
