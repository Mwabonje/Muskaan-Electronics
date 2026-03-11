import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Building2, 
  FileText, 
  Layers,
  Wrench,
  Box,
  Shield,
  Truck,
  User
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

interface CartItem {
  id: string;
  productId: number | '';
  quantity: number | '';
}

interface LogDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogDeliveryModal({ isOpen, onClose }: LogDeliveryModalProps) {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  
  const [filter, setFilter] = useState('ALL');
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: crypto.randomUUID(), productId: '', quantity: 1 }
  ]);
  const [supplierName, setSupplierName] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilter('ALL');
      setCartItems([{ id: crypto.randomUUID(), productId: '', quantity: 1 }]);
      setSupplierName('');
      setReceivedBy('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setCartItems([...cartItems, { id: crypto.randomUUID(), productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (cartItems.length > 1) {
      setCartItems(cartItems.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof CartItem, value: any) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'ALL') return true;
    if (filter === 'TOOLS') return p.category?.toLowerCase().includes('tool');
    if (filter === 'MATERIALS') return p.category?.toLowerCase().includes('material');
    if (filter === 'PPE') return p.category?.toLowerCase().includes('ppe') || p.category?.toLowerCase().includes('safety');
    return true;
  });

  const validItemsCount = cartItems.filter(item => item.productId !== '').length;
  const itemsText = validItemsCount === 0 ? 'Unknown' : validItemsCount.toString();

  const handleConfirmDelivery = async () => {
    // Basic validation
    const validItems = cartItems.filter(item => item.productId !== '' && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid item.");
      return;
    }
    if (!supplierName.trim()) {
      alert("Please enter a supplier name.");
      return;
    }
    if (!receivedBy.trim()) {
      alert("Please enter who received the delivery.");
      return;
    }

    try {
      // Create Delivery record
      await db.deliveries.add({
        items: validItems.map(item => {
          const product = products.find(p => p.id === Number(item.productId));
          return {
            productId: Number(item.productId),
            name: product?.name || 'Unknown Item',
            quantity: Number(item.quantity),
            price: 0, // Price is not strictly needed for delivery log unless tracking cost
            subtotal: 0
          };
        }),
        supplierName,
        receivedBy,
        date: new Date().toISOString(),
        notes: notes || undefined
      });

      // Update inventory stock (Increase)
      for (const item of validItems) {
        const product = products.find(p => p.id === Number(item.productId));
        if (product) {
          const newStock = product.stock + Number(item.quantity);
          const status = newStock === 0 ? 'Out of Stock' : newStock <= (product.minStock || 5) ? 'Low Stock' : 'In Stock';
          await db.products.update(product.id!, { stock: newStock, status });
        }
      }

      onClose();
    } catch (error) {
      console.error("Failed to log delivery:", error);
      alert("Failed to log delivery. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a]">
          <h2 className="text-lg font-bold text-white">Log Delivery (Receive Stock)</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Delivery Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> Supplier Name <span className="text-emerald-500">*</span>
              </label>
              <input 
                type="text" 
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. Hikvision Distributors Ltd"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Received By <span className="text-emerald-500">*</span>
              </label>
              <input 
                type="text" 
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          {/* Filter Item List */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter Item List</label>
            <div className="flex flex-wrap gap-2 bg-[#1e293b]/50 p-1 rounded-lg border border-slate-800/50">
              {[
                { id: 'ALL', icon: Layers, label: 'ALL' },
                { id: 'TOOLS', icon: Wrench, label: 'TOOLS' },
                { id: 'MATERIALS', icon: Box, label: 'MATERIALS' },
                { id: 'PPE', icon: Shield, label: 'PPE' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-colors ${
                    filter === f.id 
                      ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' 
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items Received ({cartItems.length})</label>
            
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-[#1e293b]/30 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</label>
                      <select 
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none"
                      >
                        <option value="">Select Item</option>
                        {filteredProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.stock})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty Recv.</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center"
                        min="1"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="mt-6 p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      disabled={cartItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddItem}
              className="w-full py-3 border border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Add Another Item
            </button>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Notes / Remarks
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[80px] resize-y"
              placeholder="Delivery note number, condition of goods..."
            />
          </div>

          {/* Summary */}
          <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-lg p-4 flex gap-3 items-start">
            <Truck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Delivery Summary</p>
              <p className="text-sm font-mono text-slate-300">
                Supplier: {supplierName || 'Not set'} • Items Received: {itemsText}
              </p>
              <p className="text-xs text-emerald-500/80 mt-1">
                Confirming this delivery will automatically increase your inventory stock.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-[#0f172a] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirmDelivery}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            <Truck className="w-4 h-4" /> Confirm Delivery
          </button>
        </div>
      </div>
    </div>
  );
}
