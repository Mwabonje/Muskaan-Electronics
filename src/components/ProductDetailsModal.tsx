import React, { useState, useEffect } from 'react';
import { X, Save, Package, History, ArrowUpRight, ArrowDownRight, RefreshCw, ShoppingCart, RotateCcw } from 'lucide-react';
import { db, Product, StockHistory } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialTab?: 'details' | 'history';
}

export default function ProductDetailsModal({ isOpen, onClose, product, initialTab = 'details' }: ProductDetailsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'history'>(initialTab);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);

  const fetchStockHistory = async () => {
    if (!product?.id) return;
    try {
      const { data, error } = await supabase
        .from('stock_history')
        .select('*')
        .eq('product_id', product.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setStockHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch stock history:", err);
    }
  };

  useEffect(() => {
    if (isOpen && product?.id) {
      fetchStockHistory();
    }
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (isOpen && product) {
      setFormData(product);
      setActiveTab(initialTab);
    } else if (isOpen && !product) {
      setFormData({
        name: '',
        brand: '',
        category: '',
        cost_price: '',
        selling_price: '',
        stock: 0,
        status: 'In Stock'
      });
      setActiveTab('details');
    }
  }, [isOpen, product, initialTab]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stock' || name === 'min_stock' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (product?.id) {
        // Update existing
        const oldStock = product.stock;
        const newStock = Number(formData.stock) || 0;
        
        let status = formData.status || 'In Stock';
        if (newStock <= 0) status = 'Out of Stock';
        else if (newStock <= (formData.min_stock || 5)) status = 'Low Stock';
        else status = 'In Stock';

        const { error: updateError } = await supabase
          .from('products')
          .update({ ...formData, status, stock: newStock })
          .eq('id', product.id);
        
        if (updateError) throw updateError;

        // Log stock adjustment if changed
        if (oldStock !== newStock) {
          const changeType = newStock > oldStock ? 'Addition' : 'Deduction';
          await supabase.from('stock_history').insert([{
            product_id: product.id,
            change_type: 'Adjustment',
            quantity_change: Math.abs(newStock - oldStock),
            previous_stock: oldStock,
            new_stock: newStock,
            date: new Date().toISOString(),
            reason: 'Manual adjustment via product details'
          }]);

          // Log activity
          await supabase.from('activities').insert([{
            user_id: user?.id || 0,
            user_name: user?.name || 'System',
            user_role: user?.role || 'Admin',
            type: 'Stock Adjustment',
            description: `Manually adjusted stock for ${product.name} from ${oldStock} to ${newStock}`,
            date: new Date().toISOString(),
            reference_id: product.id
          }]);
        }
      } else {
        // Add new
        const newStock = Number(formData.stock) || 0;
        let status = 'In Stock';
        if (newStock <= 0) status = 'Out of Stock';
        else if (newStock <= (formData.min_stock || 5)) status = 'Low Stock';

        const { data, error: insertError } = await supabase
          .from('products')
          .insert([{ ...formData, status, stock: newStock }])
          .select();
        
        if (insertError) throw insertError;
        const newProduct = data?.[0];
        
        if (newStock > 0 && newProduct) {
          await supabase.from('stock_history').insert([{
            product_id: newProduct.id,
            change_type: 'Addition',
            quantity_change: newStock,
            previous_stock: 0,
            new_stock: newStock,
            date: new Date().toISOString(),
            reason: 'Initial stock on creation'
          }]);
        }
      }
      onClose();
    } catch (err) {
      console.error("Failed to save product:", err);
      setError("Failed to save product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'Addition': return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'Deduction': return <ArrowDownRight className="w-4 h-4 text-rose-500" />;
      case 'Sale': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'Return': return <RotateCcw className="w-4 h-4 text-amber-500" />;
      case 'Adjustment': return <RefreshCw className="w-4 h-4 text-purple-500" />;
      default: return <Package className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {product ? 'Edit Product' : 'New Product'}
              </h2>
              {product && <p className="text-xs text-slate-500">{product.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {product && (
          <div className="flex border-b border-slate-200 px-5 bg-slate-50">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Product Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              Stock History
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-600 text-sm">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4 sm:col-span-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="e.g. iPhone 15 Pro"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="e.g. Apple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cost Price</label>
                  <input
                    type="text"
                    name="cost_price"
                    value={formData.cost_price || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="e.g. Ksh 999.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock || 0}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="e.g. Smartphones"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Selling Price</label>
                  <input
                    type="text"
                    name="selling_price"
                    value={formData.selling_price || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="e.g. Ksh 1,199.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Minimum Stock Alert</label>
                  <input
                    type="number"
                    name="min_stock"
                    value={formData.min_stock || 5}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {stockHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-base font-medium">No history found</p>
                  <p className="text-sm mt-1">Stock changes will appear here.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Change</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">New Stock</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(record.date).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                {getChangeIcon(record.change_type)}
                                <span className="text-sm font-medium text-slate-700">{record.change_type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-right">
                              <span className={
                                record.change_type === 'Addition' || record.change_type === 'Return' ? 'text-emerald-600' :
                                record.change_type === 'Deduction' || record.change_type === 'Sale' ? 'text-rose-600' :
                                'text-purple-600'
                              }>
                                {record.change_type === 'Addition' || record.change_type === 'Return' ? '+' :
                                 record.change_type === 'Deduction' || record.change_type === 'Sale' ? '-' : ''}
                                {record.quantity_change}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                              {record.new_stock}
                            </td>
                          <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[150px]" title={record.reason}>
                            {record.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'details' && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
