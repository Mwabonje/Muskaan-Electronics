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
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface CartItem {
  id: string;
  product_id: number | '';
  quantity: number | '';
}

interface LogDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogDeliveryModal({ isOpen, onClose }: LogDeliveryModalProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [approvedLPOs, setApprovedLPOs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, lposRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('purchase_orders').select('*').eq('status', 'Approved')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (lposRes.error) throw lposRes.error;

      setProducts(productsRes.data || []);
      setApprovedLPOs(lposRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);
  
  const [filter, setFilter] = useState('ALL');
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: crypto.randomUUID(), product_id: '', quantity: 1 }
  ]);
  const [selectedLpoIds, setSelectedLpoIds] = useState<number[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [driverName, setDriverName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [receivedTime, setReceivedTime] = useState('');
  const [notes, setNotes] = useState('');

  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [createdDeliveryId, setCreatedDeliveryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setCreatedDeliveryId(null);
      setError(null);
      setFilter('ALL');
      setCartItems([{ id: crypto.randomUUID(), product_id: '', quantity: 1 }]);
      setSelectedLpoIds([]);
      setSupplierName('');
      setReceivedBy('');
      setDriverName('');
      setPlateNumber('');
      setReceivedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setCartItems([...cartItems, { id: crypto.randomUUID(), product_id: '', quantity: 1 }]);
    setError(null);
  };

  const handleRemoveItem = (id: string) => {
    if (cartItems.length > 1) {
      setCartItems(cartItems.filter(item => item.id !== id));
    }
    setError(null);
  };

  const handleItemChange = (id: string, field: keyof CartItem, value: any) => {
    setError(null);
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleLpoToggle = (lpo: any) => {
    setError(null);
    const id = lpo.id!;
    let newSelectedIds: number[];
    
    if (selectedLpoIds.includes(id)) {
      newSelectedIds = selectedLpoIds.filter(i => i !== id);
    } else {
      newSelectedIds = [...selectedLpoIds, id];
    }
    
    setSelectedLpoIds(newSelectedIds);

    // Auto-populate items from selected LPOs
    if (newSelectedIds.length > 0) {
      const selectedLPOs = approvedLPOs.filter(l => newSelectedIds.includes(l.id!));
      
      // Merge items from all selected LPOs
      const itemsMap = new Map<number, number>();
      selectedLPOs.forEach(l => {
        l.items.forEach(item => {
          itemsMap.set(item.product_id, (itemsMap.get(item.product_id) || 0) + item.quantity);
        });
      });

      const newCartItems = Array.from(itemsMap.entries()).map(([product_id, quantity]) => ({
        id: crypto.randomUUID(),
        product_id,
        quantity
      }));

      setCartItems(newCartItems.length > 0 ? newCartItems : [{ id: crypto.randomUUID(), product_id: '', quantity: 1 }]);
      
      // Set supplier name from the first selected LPO if not set
      if (selectedLPOs.length > 0 && !supplierName) {
        setSupplierName(selectedLPOs[0].supplier_name);
      }
    } else {
      setCartItems([{ id: crypto.randomUUID(), product_id: '', quantity: 1 }]);
    }
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'ALL') return true;
    if (filter === 'TOOLS') return p.category?.toLowerCase().includes('tool');
    if (filter === 'MATERIALS') return p.category?.toLowerCase().includes('material');
    if (filter === 'PPE') return p.category?.toLowerCase().includes('ppe') || p.category?.toLowerCase().includes('safety');
    return true;
  });

  const validItemsCount = cartItems.filter(item => item.product_id !== '').length;
  const itemsText = validItemsCount === 0 ? 'Unknown' : validItemsCount.toString();

  const handleConfirmDelivery = async () => {
    setError(null);
    // Basic validation
    const validItems = cartItems.filter(item => item.product_id !== '' && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      setError("Please add at least one valid item.");
      return;
    }
    if (!supplierName.trim()) {
      setError("Please enter a supplier name.");
      return;
    }
    if (!receivedBy.trim()) {
      setError("Please enter who received the delivery.");
      return;
    }

    try {
      // Create Delivery record
      const { data: deliveryData, error: deliveryError } = await supabase.from('deliveries').insert([{
        items: validItems.map(item => {
          const product = products.find(p => p.id === Number(item.product_id));
          return {
            product_id: Number(item.product_id),
            name: product?.name || 'Unknown Item',
            quantity: Number(item.quantity),
            price: 0,
            subtotal: 0
          };
        }),
        supplier_name: supplierName,
        received_by: receivedBy,
        driver_name: driverName || undefined,
        plate_number: plateNumber || undefined,
        received_time: receivedTime || undefined,
        date: new Date().toISOString(),
        notes: notes || undefined,
        purchase_order_ids: selectedLpoIds.length > 0 ? selectedLpoIds : undefined
      }]).select();

      if (deliveryError) throw deliveryError;
      const deliveryId = deliveryData[0].id;

      // Update inventory stock (Increase)
      for (const item of validItems) {
        const product = products.find(p => p.id === Number(item.product_id));
        if (product) {
          const qty = Number(item.quantity);
          const newStock = product.stock + qty;
          const status = newStock === 0 ? 'Out of Stock' : newStock <= (product.min_stock || 5) ? 'Low Stock' : 'In Stock';
          
          await supabase.from('products').update({ stock: newStock, status }).eq('id', product.id);
          
          await supabase.from('stock_history').insert([{
            product_id: product.id,
            change_type: 'Addition',
            quantity_change: qty,
            previous_stock: product.stock,
            new_stock: newStock,
            date: new Date().toISOString(),
            reason: `Delivery #${deliveryId} from ${supplierName}` + (selectedLpoIds.length > 0 ? ` (LPOs: ${selectedLpoIds.map(id => `LPO-${id.toString().padStart(4, '0')}`).join(', ')})` : '')
          }]);
        }
      }

      // Update LPO statuses to 'Delivered'
      if (selectedLpoIds.length > 0) {
        for (const id of selectedLpoIds) {
          await supabase.from('purchase_orders').update({ status: 'Delivered' }).eq('id', id);
        }
      }

      // Log activity
      await supabase.from('activities').insert([{
        user_id: user?.id || 0,
        user_name: user?.name || 'System',
        user_role: user?.role || 'Cashier',
        type: 'Delivery',
        description: `Logged a delivery of ${validItems.length} items from ${supplierName}`,
        date: new Date().toISOString(),
        reference_id: deliveryId
      }]);

      setCreatedDeliveryId(deliveryId);
      setStep('preview');
    } catch (err) {
      console.error("Failed to log delivery:", err);
      setError("Failed to log delivery. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (step === 'preview') {
    const validItems = cartItems.filter(item => item.product_id !== '' && Number(item.quantity) > 0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden" onClick={onClose}></div>
        
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
          {/* Header - Hidden in print */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 print:hidden">
            <h2 className="text-lg font-bold text-slate-800">Delivery Preview</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery Body */}
          <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 print:overflow-visible print:p-4">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
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

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier</p>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {supplierName}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Received By</p>
                  <div className="flex flex-col text-slate-800 font-medium">
                    <div className="flex items-center gap-2">
                       <User className="w-4 h-4 text-slate-400" />
                       {receivedBy}
                    </div>
                    {receivedTime && <span className="text-xs text-slate-500 ml-6">at {receivedTime}</span>}
                  </div>
                </div>
                {(driverName || plateNumber) && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transport Details</p>
                    <div className="flex flex-col text-slate-800 font-medium">
                      {driverName && (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          Driver: {driverName}
                        </div>
                      )}
                      {plateNumber && (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">PL</span>
                          Plate: {plateNumber}
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
                    <span className="text-slate-500">Delivery #:</span> {createdDeliveryId}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-slate-800 font-medium">
                    <span className="text-slate-500">Date:</span> {new Date().toLocaleDateString()}
                  </div>
                  {selectedLpoIds.length > 0 && (
                    <div className="flex items-center justify-end gap-2 text-slate-800 font-medium flex-wrap">
                      <span className="text-slate-500">Linked LPOs:</span> 
                      {selectedLpoIds.map(id => (
                        <span key={id} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">LPO-{id.toString().padStart(4, '0')}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse mb-8">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Description</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validItems.map(item => {
                  const product = products.find(p => p.id === Number(item.product_id));
                  const qty = Number(item.quantity);
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-slate-800">{product?.name || 'Unknown Item'}</td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">{qty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {notes && (
              <div className="pt-8 border-t border-slate-200 mt-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes & Remarks</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
              </div>
            )}
            
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

          {/* Footer - Hidden in print */}
          <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 print:hidden">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
            <button 
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4" /> Print Delivery Note
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          
          {/* LPO Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Select Approved LPOs to Receive (Optional)
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 bg-[#1e293b]/20 border border-slate-800 rounded-lg custom-scrollbar">
              {approvedLPOs.map(lpo => (
                <button
                  key={lpo.id}
                  onClick={() => handleLpoToggle(lpo)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-colors border ${
                    selectedLpoIds.includes(lpo.id!) 
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                      : 'bg-slate-800/50 text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  LPO-{lpo.id?.toString().padStart(4, '0')} ({lpo.supplier_name})
                </button>
              ))}
              {approvedLPOs.length === 0 && (
                <p className="text-[10px] text-slate-500 p-2 italic w-full">No approved purchase orders available.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg flex items-start gap-2 text-rose-500 text-sm">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> Time Received
              </label>
              <input 
                type="time" 
                value={receivedTime}
                onChange={(e) => setReceivedTime(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3 h-3" /> Driver's Name
              </label>
              <input 
                type="text" 
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. Samuel Waweru"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> Number Plate
              </label>
              <input 
                type="text" 
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. KDL 123X"
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
                        value={item.product_id}
                        onChange={(e) => handleItemChange(item.id, 'product_id', e.target.value ? Number(e.target.value) : '')}
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
