import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  User,
  ScanLine,
  X,
  Printer,
  FileText,
  Shield,
} from "lucide-react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, type Product } from "../db/db";
import { useAuth } from "../context/AuthContext";

export default function POS() {
  const { user } = useAuth();
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(
    [],
  );
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card">("Cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdSaleId, setCreatedSaleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const categories = [
    "All",
    "Smartphones",
    "Laptops",
    "Televisions",
    "Audio",
    "Tablets",
    "Wearables",
  ];

  const addToCart = (product: Product) => {
    const stock = Number(product.stock) || 0;
    const existing = cart.find((item) => item.product.id === product.id);
    
    if (existing) {
      const currentQty = Number(existing.quantity) || 0;
      if (currentQty + 1 > stock) {
        setStockWarning(`Cannot add more. Only ${stock} units of ${product.name} available in stock.`);
        return;
      }
    } else if (stock < 1) {
      setStockWarning(`Cannot add ${product.name}. It is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existingInner = prev.find((item) => item.product.id === product.id);
      if (existingInner) {
        const currentQtyInner = Number(existingInner.quantity) || 0;
        if (currentQtyInner + 1 > stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: currentQtyInner + 1 }
            : item,
        );
      }
      if (stock < 1) return prev;
      return [...prev, { product, quantity: 1 }];
    });
    setError(null);
  };

  const updateQuantity = (id: number, delta: number) => {
    const existing = cart.find((item) => item.product.id === id);
    if (!existing) return;

    const stock = Number(existing.product.stock) || 0;
    const currentQty = Number(existing.quantity) || 0;
    const newQuantity = Math.max(1, currentQty + delta);

    if (newQuantity > stock) {
      setStockWarning(`Cannot increase quantity. Only ${stock} units of ${existing.product.name} available.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === id) {
          const itemStock = Number(item.product.stock) || 0;
          const itemQty = Number(item.quantity) || 0;
          const itemNewQty = Math.max(1, itemQty + delta);
          if (itemNewQty > itemStock) return item;
          return { ...item, quantity: itemNewQty };
        }
        return item;
      }),
    );
    setError(null);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    setError(null);
  };

  const parsePrice = (priceStr: string | number | undefined | null) => {
    if (priceStr == null) return 0;
    if (typeof priceStr === "number") return priceStr;
    return parseFloat(priceStr.toString().replace(/[^0-9.-]+/g, "")) || 0;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + parsePrice(item.product.selling) * item.quantity,
    0,
  );
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === "All" || p.category === activeCategory;
    const matchesSearch =
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCheckout = async () => {
    setError(null);
    if (cart.length === 0) return;

    try {
      // Re-validate stock before checkout
      for (const item of cart) {
        const productInDb = await db.products.get(item.product.id!);
        const currentStock = productInDb ? (Number(productInDb.stock) || 0) : 0;
        const itemQty = Number(item.quantity) || 0;
        
        if (itemQty <= 0) {
          setError(`Invalid quantity for ${item.product.name}.`);
          return;
        }
        
        if (itemQty > currentStock) {
          setStockWarning(`Checkout failed. Only ${currentStock} units of ${item.product.name} are currently available in stock.`);
          
          // Auto-adjust the cart to the maximum available
          setCart((prev) =>
            prev.map((cartItem) =>
              cartItem.product.id === item.product.id
                ? { ...cartItem, quantity: currentStock }
                : cartItem
            ).filter(cartItem => cartItem.quantity > 0)
          );
          return; // Abort checkout
        }
      }

      const saleId = await db.sales.add({
        items: cart.map((item) => ({
          productId: item.product.id!,
          name: item.product.name,
          quantity: item.quantity,
          price: parsePrice(item.product.selling),
          subtotal: parsePrice(item.product.selling) * item.quantity,
        })),
        totalAmount: total,
        paymentMethod: paymentMethod,
        customerName: "Walk-in Customer",
        date: new Date().toISOString(),
        userId: user?.id,
        userName: user?.name,
      });

      // Update stock
      for (const item of cart) {
        if (item.product.id) {
          const productInDb = await db.products.get(item.product.id);
          if (!productInDb) continue;
          
          const currentStock = Number(productInDb.stock) || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          const status =
            newStock === 0
              ? "Out of Stock"
              : newStock <= (productInDb.minStock || 5)
                ? "Low Stock"
                : "In Stock";

          await db.products.update(item.product.id, {
            stock: newStock,
            status,
          });

          await db.stockHistory.add({
            productId: item.product.id,
            changeType: "Sale",
            quantityChange: -item.quantity,
            previousStock: currentStock,
            newStock: newStock,
            date: new Date().toISOString(),
            reason: `POS Sale #${saleId}`,
          });
        }
      }

      setCreatedSaleId(saleId as number);
      setShowReceipt(true);
    } catch (err) {
      console.error("Failed to process sale:", err);
      setError("Failed to process sale. Please try again.");
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCart([]);
    setCreatedSaleId(null);
    setError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background-light font-display lg:overflow-hidden overflow-y-auto">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col lg:h-full min-h-[600px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              Point of Sale
            </h1>
          </div>

          <div className="flex items-center flex-1 max-w-md justify-end">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 sm:w-5 h-4 sm:h-5" />
              <input
                type="text"
                placeholder="Search by name or category..."
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
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all group text-left flex flex-col"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  <img
                    src={
                      product.image ||
                      `https://picsum.photos/seed/${product.id}/200`
                    }
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-slate-700 shadow-sm">
                    {product.stock} in stock
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      {product.category}
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>
                  <p className="text-primary font-bold mt-3">
                    Ksh {parsePrice(product.selling).toFixed(2)}
                  </p>
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
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 group"
                >
                  <img
                    src={
                      item.product.image ||
                      `https://picsum.photos/seed/${item.product.id}/200`
                    }
                    alt={item.product.name}
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2 pr-2">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-primary font-bold text-sm">
                        Ksh {parsePrice(item.product.selling).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const stock = Number(item.product.stock) || 0;
                            if (!isNaN(val) && val > stock) {
                              setStockWarning(`Cannot set quantity to ${val}. Only ${stock} units of ${item.product.name} available.`);
                              setCart((prev) =>
                                prev.map((cartItem) =>
                                  cartItem.product.id === item.product.id
                                    ? { ...cartItem, quantity: stock }
                                    : cartItem
                                )
                              );
                              return;
                            }
                            
                            // Prevent negative numbers while typing
                            if (!isNaN(val) && val < 0) {
                              return;
                            }
                            
                            setCart((prev) =>
                              prev.map((cartItem) =>
                                cartItem.product.id === item.product.id
                                  ? { ...cartItem, quantity: isNaN(val) ? 0 : val }
                                  : cartItem
                              )
                            );
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (isNaN(val) || val < 1) {
                              setCart((prev) =>
                                prev.map((cartItem) =>
                                  cartItem.product.id === item.product.id
                                    ? { ...cartItem, quantity: 1 }
                                    : cartItem
                                )
                              );
                            }
                          }}
                          className="w-10 text-xs font-bold text-center border-none bg-transparent focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
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
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-600 text-sm">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">
                Ksh {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Tax (18%)</span>
              <span className="font-medium text-slate-900">
                Ksh {tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Discount</span>
              <span className="font-medium text-emerald-500">-Ksh 0.00</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-2xl font-black text-primary">
                Ksh {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              disabled={cart.length === 0}
              onClick={() => setPaymentMethod("Cash")}
              className={`flex items-center justify-center gap-2 py-3 bg-white border rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                paymentMethod === "Cash"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-slate-200 text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              <Banknote className="w-5 h-5" />
              Cash
            </button>
            <button
              disabled={cart.length === 0}
              onClick={() => setPaymentMethod("Card")}
              className={`flex items-center justify-center gap-2 py-3 bg-white border rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                paymentMethod === "Card"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-slate-200 text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Card
            </button>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            Pay Ksh {total.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden"
            onClick={handleCloseReceipt}
          ></div>

          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
            {/* Header - Hidden in print */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 print:hidden">
              <h2 className="text-lg font-bold text-slate-800">
                Receipt Preview
              </h2>
              <button
                onClick={handleCloseReceipt}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 print:overflow-visible print:p-4">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  MUSKAAN ELECTRONICS
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  123 Main Street, City
                </p>
                <p className="text-sm text-slate-600">Tel: +254 700 000 000</p>
                <p className="text-sm text-slate-600 mt-2">
                  Receipt #: {createdSaleId}
                </p>
                <p className="text-sm text-slate-600">
                  Date: {new Date().toLocaleString()}
                </p>
              </div>

              <div className="border-t border-b border-slate-200 py-4 mb-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                        Qty
                      </th>
                      <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                        Price
                      </th>
                      <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => {
                      const price = parsePrice(item.product.selling);
                      return (
                        <tr key={item.product.id}>
                          <td className="py-2 text-sm font-medium text-slate-800">
                            {item.product.name}
                          </td>
                          <td className="py-2 text-sm text-slate-600 text-center">
                            {item.quantity}
                          </td>
                          <td className="py-2 text-sm text-slate-600 text-right">
                            {price.toLocaleString()}
                          </td>
                          <td className="py-2 text-sm font-bold text-slate-800 text-right">
                            {(price * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>Ksh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (18%)</span>
                  <span>Ksh {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>Ksh {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-sm text-slate-600">
                <p>Payment Method: {paymentMethod}</p>
                <p className="mt-2 font-medium">Thank you for your business!</p>
              </div>
            </div>

            {/* Footer - Hidden in print */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 print:hidden">
              <button
                onClick={handleCloseReceipt}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Warning Modal */}
      {stockWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900 mb-2">
                Insufficient Stock
              </h3>
              <p className="text-slate-600 text-center mb-6">
                {stockWarning}
              </p>
              <button
                onClick={() => setStockWarning(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
