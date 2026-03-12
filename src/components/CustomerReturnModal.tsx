import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  User, 
  FileText, 
  Layers,
  Wrench,
  Box,
  Shield,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

interface CartItem {
  id: string;
  productId: number | '';
  price: number | '';
  quantity: number | '';
}

interface CustomerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerReturnModal({ isOpen, onClose }: CustomerReturnModalProps) {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  
  const [filter, setFilter] = useState('ALL');
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: crypto.randomUUID(), productId: '', price: 0, quantity: 1 }
  ]);
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'Good' | 'Damaged'>('Good');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilter('ALL');
      setCartItems([{ id: crypto.randomUUID(), productId: '', price: 0, quantity: 1 }]);
      setCustomerName('');
      setReason('');
      setCondition('Good');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setCartItems([...cartItems, { id: crypto.randomUUID(), productId: '', price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (cartItems.length > 1) {
      setCartItems(cartItems.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof CartItem, value: any) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-fill price when product is selected
        if (field === 'productId' && value !== '') {
          const product = products.find(p => p.id === Number(value));
          if (product) {
            const priceString = String(product.selling).replace(/[^0-9.-]+/g,"");
            updatedItem.price = Number(priceString);
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculations
  const totalRefund = cartItems.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  const filteredProducts = products.filter(p => {
    if (filter === 'ALL') return true;
    if (filter === 'TOOLS') return p.category?.toLowerCase().includes('tool');
    if (filter === 'MATERIALS') return p.category?.toLowerCase().includes('material');
    if (filter === 'PPE') return p.category?.toLowerCase().includes('ppe') || p.category?.toLowerCase().includes('safety');
    return true;
  });

  const validItemsCount = cartItems.filter(item => item.productId !== '').length;
  const itemsText = validItemsCount === 0 ? 'Unknown' : validItemsCount.toString();

  const handleConfirmReturn = async () => {
    // Basic validation
    const validItems = cartItems.filter(item => item.productId !== '' && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid item.");
      return;
    }
    if (!customerName.trim()) {
      alert("Please enter the customer's name.");
      return;
    }
    if (!reason.trim()) {
      alert("Please enter a reason for the return.");
      return;
    }

    try {
      // Create Return record
      const returnId = await db.returns.add({
        items: validItems.map(item => {
          const product = products.find(p => p.id === Number(item.productId));
          return {
            productId: Number(item.productId),
            name: product?.name || 'Unknown Item',
            quantity: Number(item.quantity),
            price: Number(item.price),
            subtotal: Number(item.quantity) * Number(item.price)
          };
        }),
        totalRefund,
        customerName,
        reason,
        condition,
        date: new Date().toISOString()
      });

      // Update inventory stock (Increase) ONLY if condition is Good
      if (condition === 'Good') {
        for (const item of validItems) {
          const product = products.find(p => p.id === Number(item.productId));
          if (product) {
            const qty = Number(item.quantity);
            const newStock = product.stock + qty;
            const status = newStock === 0 ? 'Out of Stock' : newStock <= (product.minStock || 5) ? 'Low Stock' : 'In Stock';
            await db.products.update(product.id!, { stock: newStock, status });
            
            await db.stockHistory.add({
              productId: product.id!,
              changeType: 'Return',
              quantityChange: qty,
              previousStock: product.stock,
              newStock: newStock,
              date: new Date().toISOString(),
              reason: `Return #${returnId}`
            });
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Failed to process return:", error);
      alert("Failed to process return. Please try again.");
    }
  };

  const formatPrice = (priceStr: string | number) => {
    if (typeof priceStr === 'number') return priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const num = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a]">
          <h2 className="text-lg font-bold text-white">Process Customer Return</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Customer Name <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Item Condition <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCondition('Good')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                    condition === 'Good' 
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' 
                      : 'bg-[#0f172a] text-slate-400 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Good (Resellable)
                </button>
                <button 
                  onClick={() => setCondition('Damaged')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                    condition === 'Damaged' 
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' 
                      : 'bg-[#0f172a] text-slate-400 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Damaged
                </button>
              </div>
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
                      ? 'bg-rose-600/20 text-rose-500 border border-rose-500/30' 
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items Returned ({cartItems.length})</label>
            
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-[#1e293b]/30 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</label>
                      <select 
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none appearance-none"
                      >
                        <option value="">Select Item</option>
                        {filteredProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - Sold at Ksh {formatPrice(p.selling)}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="mt-6 p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      disabled={cartItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Refund Amount (Ksh)</label>
                      <input 
                        type="number" 
                        value={item.price}
                        onChange={(e) => handleItemChange(item.id, 'price', e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-24 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none text-center"
                        min="1"
                      />
                    </div>
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

          {/* Totals */}
          <div className="bg-[#1e293b]/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Refund</span>
              <span className="text-2xl font-bold text-white">Ksh {totalRefund.toLocaleString()}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Reason for Return <span className="text-rose-500">*</span>
            </label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none min-h-[80px] resize-y"
              placeholder="Why is the customer returning this item?"
            />
          </div>

          {/* Summary */}
          <div className="bg-rose-900/10 border border-rose-900/30 rounded-lg p-4 flex gap-3 items-start">
            <RotateCcw className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Return Summary</p>
              <p className="text-sm font-mono text-slate-300">
                Customer: {customerName || 'Not set'} • Items: {itemsText} • Refund: Ksh {totalRefund.toLocaleString()}
              </p>
              <p className="text-xs text-rose-500/80 mt-1">
                {condition === 'Good' 
                  ? 'Items will be added back to inventory stock.' 
                  : 'Items are marked damaged and will NOT be added back to stock.'}
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
            onClick={handleConfirmReturn}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-rose-900/20"
          >
            <RotateCcw className="w-4 h-4" /> Process Return
          </button>
        </div>
      </div>
    </div>
  );
}
