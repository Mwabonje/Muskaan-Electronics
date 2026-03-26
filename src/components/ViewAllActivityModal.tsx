import { X, ShoppingCart, FileText, Truck } from "lucide-react";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db } from "../db/db";
import { useAuth } from "../context/AuthContext";
import { canViewActivity } from "../utils/permissions";

interface ViewAllActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewAllActivityModal({
  isOpen,
  onClose,
}: ViewAllActivityModalProps) {
  const { user } = useAuth();
  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  const allSales = useLiveQuery(() => db.sales.reverse().toArray().then(arr => arr.filter(s => canViewActivity(s.userId, user, users))), [user, users]) || [];
  const allLPOs = useLiveQuery(() => db.lpos.reverse().toArray().then(arr => arr.filter(l => canViewActivity(l.userId, user, users))), [user, users]) || [];
  const allDeliveries = useLiveQuery(() => db.deliveries.reverse().toArray().then(arr => arr.filter(d => canViewActivity(d.userId, user, users))), [user, users]) || [];

  const allActivities = [...allSales.map(s => ({ ...s, type: 'Sale' })), 
                            ...allLPOs.map(l => ({ ...l, type: 'LPO' })),
                            ...allDeliveries.map(d => ({ ...d, type: 'Delivery' }))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50); // Limit to last 50 for performance

  if (!isOpen) return null;

  const formatPrice = (priceStr: string | number | undefined | null) => {
    if (priceStr == null) return "Ksh 0.00";
    if (typeof priceStr === "number")
      return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.toString().replace(/[^0-9.-]+/g, "")) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">All Recent Activity</h2>
            <p className="text-sm text-slate-400 mt-1">
              Showing the latest 50 activities across the system.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close activity modal"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-800/50">
              {allActivities.length > 0 ? (
                allActivities.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-[#1e293b]/50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'Sale' ? 'bg-emerald-500/10 text-emerald-400' :
                        activity.type === 'LPO' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {activity.type === 'Sale' && <ShoppingCart className="w-4 h-4" aria-hidden="true" />}
                        {activity.type === 'LPO' && <FileText className="w-4 h-4" aria-hidden="true" />}
                        {activity.type === 'Delivery' && <Truck className="w-4 h-4" aria-hidden="true" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {activity.type === 'Sale' ? `Sale #${activity.id ? activity.id.toString().padStart(4, '0') : '0000'}` :
                           activity.type === 'LPO' ? `LPO #${activity.id ? activity.id.toString().padStart(4, '0') : '0000'}` :
                           `Delivery #${activity.id ? activity.id.toString().padStart(4, '0') : '0000'}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(activity.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.type !== 'Delivery' && (
                        <p className="text-sm font-bold text-white">
                          {formatPrice((activity as any).totalAmount)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        {activity.type === 'Sale' ? (activity as any).customerName || 'Walk-in' :
                         activity.type === 'LPO' ? (activity as any).supplierName :
                         (activity as any).supplierName}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No activities found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
