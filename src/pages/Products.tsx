import { useState } from 'react';
import { Search, Plus, Upload, Edit, Trash2, ChevronLeft, ChevronRight, Filter, ChevronDown, History } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../db/db';
import ProductDetailsModal from '../components/ProductDetailsModal';

export default function Products() {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'details' | 'history'>('details');

  const handleOpenModal = (product: Product | null = null, tab: 'details' | 'history' = 'details') => {
    setSelectedProduct(product);
    setInitialTab(tab);
    setIsModalOpen(true);
  };

  const formatPrice = (priceStr: string | number) => {
    if (typeof priceStr === 'number') return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black leading-tight tracking-tight">Product Management</h1>
          <p className="text-slate-500 text-base font-normal">Real-time control over your global stock and pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add Product</span>
          </button>
          <button className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary/10 text-primary text-sm font-bold">
            <Upload className="w-4 h-4 mr-2" />
            <span>Import</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="flex w-full items-center rounded-lg h-12 bg-white border border-primary/10 shadow-sm focus-within:ring-2 focus-within:ring-primary/50 px-4">
            <Search className="text-slate-400 w-5 h-5" />
            <input 
              className="w-full bg-transparent border-none outline-none px-3 text-sm" 
              placeholder="Search by name, SKU, or serial number..." 
            />
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto">
          <button className="flex h-12 items-center justify-center gap-x-2 rounded-lg bg-white border border-primary/10 px-4 text-slate-700 hover:border-primary transition-colors whitespace-nowrap">
            <span className="text-sm font-medium">Category: All</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex h-12 items-center justify-center gap-x-2 rounded-lg bg-white border border-primary/10 px-4 text-slate-700 hover:border-primary transition-colors whitespace-nowrap">
            <span className="text-sm font-medium">Brand: All</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex h-12 items-center justify-center gap-x-2 rounded-lg bg-white border border-primary/10 px-4 text-slate-700 hover:border-primary transition-colors whitespace-nowrap">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">More Filters</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-primary/10">
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Product Name</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Brand</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Cost</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Selling</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Stock</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-6 py-4 text-slate-900 text-sm font-medium">{product.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{product.brand}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm font-mono whitespace-nowrap">{formatPrice(product.cost)}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm font-mono whitespace-nowrap">{formatPrice(product.selling)}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm font-semibold">{product.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                      product.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                      product.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        product.status === 'In Stock' ? 'bg-green-500' :
                        product.status === 'Low Stock' ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`}></span>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(product, 'history')}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Stock History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => product.id && db.products.delete(product.id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between border-t border-primary/10 bg-slate-50 px-6 py-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">1</span> to <span className="font-semibold text-slate-900">5</span> of <span className="font-semibold text-slate-900">124</span> results
          </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-primary/10 bg-white text-slate-400 hover:bg-primary hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-primary/10 bg-primary text-white font-medium">1</button>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-primary/10 bg-white text-slate-700 hover:bg-primary hover:text-white transition-colors">2</button>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-primary/10 bg-white text-slate-700 hover:bg-primary hover:text-white transition-colors">3</button>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-primary/10 bg-white text-slate-400 hover:bg-primary hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ProductDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct} 
        initialTab={initialTab}
      />
    </div>
  );
}
