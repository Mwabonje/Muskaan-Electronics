import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Plus,
  Tag,
  User,
  CreditCard,
  FileText,
  Receipt,
  Layers,
  Wrench,
  Box,
  Shield,
  Percent,
  Banknote,
  Smartphone,
} from "lucide-react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db } from "../db/db";
import { useAuth } from "../context/AuthContext";

interface CartItem {
  id: string;
  productId: number | "";
  price: number | "";
  quantity: number | "";
}

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewSaleModal({ isOpen, onClose }: NewSaleModalProps) {
  const { user } = useAuth();
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const [filter, setFilter] = useState("ALL");
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: crypto.randomUUID(), productId: "", price: 0, quantity: 1 },
  ]);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState<number | "">(0);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-Pesa">("Cash");
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState<"form" | "preview">("form");
  const [createdSaleId, setCreatedSaleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setCreatedSaleId(null);
      setError(null);
      setFilter("ALL");
      setCartItems([
        { id: crypto.randomUUID(), productId: "", price: 0, quantity: 1 },
      ]);
      setDiscountType("percent");
      setDiscountValue(0);
      setCustomerName("");
      setPaymentMethod("Cash");
      setNotes("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setCartItems([
      ...cartItems,
      { id: crypto.randomUUID(), productId: "", price: 0, quantity: 1 },
    ]);
    setError(null);
  };

  const handleRemoveItem = (id: string) => {
    if (cartItems.length > 1) {
      setCartItems(cartItems.filter((item) => item.id !== id));
    }
    setError(null);
  };

  const handleItemChange = (id: string, field: keyof CartItem, value: any) => {
    setError(null);
    setCartItems(
      cartItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Auto-fill price when product is selected
          if (field === "productId" && value !== "") {
            const product = products.find((p) => p.id === Number(value));
            if (product) {
              const priceString = String(product.selling || "0").replace(
                /[^0-9.-]+/g,
                "",
              );
              updatedItem.price = Number(priceString);
            }
          }
          return updatedItem;
        }
        return item;
      }),
    );
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const discountAmount =
    discountType === "percent"
      ? subtotal * ((Number(discountValue) || 0) / 100)
      : Number(discountValue) || 0;

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const filteredProducts = products.filter((p) => {
    if (filter === "ALL") return true;
    // Basic category matching based on filter names
    if (filter === "TOOLS") return p.category?.toLowerCase().includes("tool");
    if (filter === "MATERIALS")
      return p.category?.toLowerCase().includes("material");
    if (filter === "PPE")
      return (
        p.category?.toLowerCase().includes("ppe") ||
        p.category?.toLowerCase().includes("safety")
      );
    return true;
  });

  const validItemsCount = cartItems.filter(
    (item) => item.productId !== "",
  ).length;
  const itemsText =
    validItemsCount === 0 ? "Unknown" : validItemsCount.toString();

  const handleConfirmSale = async () => {
    setError(null);
    // Basic validation
    const validItems = cartItems.filter(
      (item) => item.productId !== "" && Number(item.quantity) > 0,
    );
    if (validItems.length === 0) {
      setError("Please add at least one valid item.");
      return;
    }

    try {
      // Create sale record
      const saleId = await db.sales.add({
        items: validItems.map((item) => {
          const product = products.find((p) => p.id === Number(item.productId));
          return {
            productId: Number(item.productId),
            name: product?.name || "Unknown Item",
            quantity: Number(item.quantity),
            price: Number(item.price),
            subtotal: Number(item.quantity) * Number(item.price),
          };
        }),
        totalAmount: grandTotal,
        paymentMethod,
        date: new Date().toISOString(),
        customerName: customerName || undefined,
        notes: notes || undefined,
        userId: user?.id,
        userName: user?.name,
      });

      // Update inventory stock
      for (const item of validItems) {
        const product = products.find((p) => p.id === Number(item.productId));
        if (product) {
          const qty = Number(item.quantity);
          const newStock = Math.max(0, product.stock - qty);
          const status =
            newStock === 0
              ? "Out of Stock"
              : newStock <= (product.minStock || 5)
                ? "Low Stock"
                : "In Stock";
          await db.products.update(product.id!, { stock: newStock, status });

          await db.stockHistory.add({
            productId: product.id!,
            changeType: "Sale",
            quantityChange: qty,
            previousStock: product.stock,
            newStock: newStock,
            date: new Date().toISOString(),
            reason: `Sale #${saleId}`,
          });
        }
      }

      setCreatedSaleId(saleId);
      setStep("preview");
    } catch (err) {
      console.error("Failed to record sale:", err);
      setError("Failed to record sale. Please try again.");
    }
  };

  const formatPrice = (priceStr: string | number | undefined | null) => {
    if (priceStr == null) return "0.00";
    if (typeof priceStr === "number")
      return priceStr.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const num = parseFloat(priceStr.toString().replace(/[^0-9.-]+/g, "")) || 0;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (step === "preview") {
    const validItems = cartItems.filter(
      (item) => item.productId !== "" && Number(item.quantity) > 0,
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden"
          onClick={onClose}
        ></div>

        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
          {/* Header - Hidden in print */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 print:hidden">
            <h2 className="text-lg font-bold text-slate-800">
              Receipt Preview
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Receipt Body */}
          <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-800 print:overflow-visible print:p-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-slate-900 mb-1">
                MUSKAAN ELECTRONICS
              </h1>
              <p className="text-sm text-slate-500">123 Main Street, City</p>
              <p className="text-sm text-slate-500">Tel: +254 700 000 000</p>
            </div>

            <div className="flex justify-between items-end mb-6 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                  Receipt No.
                </p>
                <p className="text-sm font-mono font-bold">
                  #{(createdSaleId?.toString() || "").padStart(6, "0")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                  Date
                </p>
                <p className="text-sm font-mono">
                  {new Date().toLocaleDateString()}{" "}
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            {customerName && (
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                  Customer
                </p>
                <p className="text-sm font-medium">{customerName}</p>
              </div>
            )}

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="text-center py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {validItems.map((item) => {
                  const product = products.find(
                    (p) => p.id === Number(item.productId),
                  );
                  const price = Number(item.price);
                  const qty = Number(item.quantity);
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 font-medium">
                        {product?.name || "Unknown Item"}
                      </td>
                      <td className="py-3 text-center">{qty}</td>
                      <td className="py-3 text-right">
                        {price.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-bold">
                        {(price * qty).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="space-y-2 mb-8">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>Ksh {subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-rose-500">
                  <span>Discount</span>
                  <span>- Ksh {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>Ksh {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center text-sm text-slate-500 space-y-1">
              <p>
                Payment Method:{" "}
                <span className="font-bold text-slate-700">
                  {paymentMethod}
                </span>
              </p>
              <p>Thank you for your business!</p>
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
              <FileText className="w-4 h-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-2xl bg-[#0B1120] rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a]">
          <h2 className="text-lg font-bold text-white">Record New Sale</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg flex items-start gap-2 text-rose-500 text-sm">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Filter Item List */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Filter Item List
            </label>
            <div className="flex flex-wrap gap-2 bg-[#1e293b]/50 p-1 rounded-lg border border-slate-800/50">
              {[
                { id: "ALL", icon: Layers, label: "ALL" },
                { id: "TOOLS", icon: Wrench, label: "TOOLS" },
                { id: "MATERIALS", icon: Box, label: "MATERIALS" },
                { id: "PPE", icon: Shield, label: "PPE" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-colors ${
                    filter === f.id
                      ? "bg-blue-600/20 text-blue-500 border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Items ({cartItems.length})
            </label>

            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#1e293b]/30 border border-slate-800 rounded-xl space-y-4"
                >
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Item
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "productId",
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                      >
                        <option value="">Select Item</option>
                        {filteredProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - Ksh {formatPrice(p.selling)}
                          </option>
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Price (Ksh)
                      </label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "price",
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-24 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Qty
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "quantity",
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
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
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>Subtotal</span>
              <span>Ksh {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Grand Total
              </span>
              <span className="text-2xl font-bold text-white">
                Ksh {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Discount
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 text-sm">
                    {discountType === "percent" ? "%" : "Ksh"}
                  </span>
                </div>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex bg-[#0f172a] border border-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${discountType === "percent" ? "bg-[#1e293b] text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
                >
                  %
                </button>
                <button
                  onClick={() => setDiscountType("fixed")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${discountType === "fixed" ? "bg-[#1e293b] text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Ksh
                </button>
              </div>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> Customer Name (Optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Walk-in or Company Name"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Payment Method{" "}
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentMethod("Cash")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-colors ${
                  paymentMethod === "Cash"
                    ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-[#1e293b] text-slate-400 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                <Banknote className="w-4 h-4" /> Cash
              </button>
              <button
                onClick={() => setPaymentMethod("M-Pesa")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-colors ${
                  paymentMethod === "M-Pesa"
                    ? "bg-[#1e293b] text-white border border-slate-600 shadow-sm"
                    : "bg-[#1e293b] text-slate-400 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                <Smartphone className="w-4 h-4" /> M-Pesa
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Notes / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[80px] resize-y"
              placeholder="Additional sale info..."
            />
          </div>

          {/* Sale Summary */}
          <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4 flex gap-3 items-start">
            <Receipt className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                Sale Summary
              </p>
              <p className="text-sm font-mono text-slate-300">
                Items: {itemsText} • Payment: {paymentMethod} • Total: Ksh{" "}
                {grandTotal.toLocaleString()}
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
            onClick={handleConfirmSale}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <Receipt className="w-4 h-4" /> Confirm Sale
          </button>
        </div>
      </div>
    </div>
  );
}
