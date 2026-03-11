import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, ArrowLeft, Plus, Minus, Trash2, CreditCard, Banknote, User, ScanLine } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';

export default function POS() {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Smartphones', 'Laptops', 'Televisions', 'Audio', 'Tablets', 'Wearables'];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const parsePrice = (priceStr: string) => {
    return parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;
  };

  const subtotal = cart.reduce((sum, item) => sum + (parsePrice(item.product.selling) * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background-light font-display lg:overflow-hidden overflow-y-auto">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col lg:h-full min-h-[600px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Point of Sale</h1>
          </div>
          
          <div className="flex items-center flex-1 max-w-md justify-end">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 sm:w-5 h-4 sm:h-5" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none text-xs sm:text-sm"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-md text-slate-500 shadow-sm border border-slate-200 hover:text-primary transition-colors hidden sm:block">
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border-b border-slate-200 p-4 shrink-0 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === category 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all group text-left flex flex-col"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  <img src={product.image || `https://picsum.photos/seed/${product.id}/200`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-slate-700 shadow-sm">
                    {product.stock} in stock
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{product.category}</p>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">{product.name}</h3>
                  </div>
                  <p className="text-primary font-bold mt-3">${parsePrice(product.selling).toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="w-full lg:w-[400px] flex flex-col lg:h-full min-h-[500px] lg:min-h-0 bg-white shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  <img src={item.product.image || `https://picsum.photos/seed/${item.product.id}/200`} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white" referrerPolicy="no-referrer" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2 pr-2">{item.product.name}</h4>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-primary font-bold text-sm">${parsePrice(item.product.selling).toFixed(2)}</p>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Payment */}
        <div className="border-t border-slate-200 p-6 shrink-0 bg-slate-50">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Tax (18%)</span>
              <span className="font-medium text-slate-900">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Discount</span>
              <span className="font-medium text-emerald-500">-$0.00</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-2xl font-black text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button 
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Banknote className="w-5 h-5" />
              Cash
            </button>
            <button 
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <CreditCard className="w-5 h-5" />
              Card
            </button>
          </div>
          
          <button 
            disabled={cart.length === 0}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            Pay ${total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
