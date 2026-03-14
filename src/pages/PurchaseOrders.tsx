import { useState, useEffect } from 'react';
import { db, PurchaseOrder } from '../db/db';
import { Search, Download, ClipboardList, ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import ViewLPOModal from '../components/ViewLPOModal';
import CreateLPOModal from '../components/CreateLPOModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function PurchaseOrders() {
  const { user, role } = useAuth();
  const [lpos, setLpos] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLPO, setSelectedLPO] = useState<PurchaseOrder | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const itemsPerPage = 15;
  const isAdmin = role === 'Super Admin' || role === 'Manager';

  const fetchLPOs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setLpos(data || []);
    } catch (err) {
      console.error("Failed to fetch LPOs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLPOs();
  }, []);

  const filteredLPOs = lpos.filter(lpo => {
    const matchesSearch = 
      (lpo.supplier_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      lpo.id?.toString().includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredLPOs.length / itemsPerPage);
  const paginatedLPOs = filteredLPOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatPrice = (priceStr: string | number) => {
    if (typeof priceStr === 'number') return `Ksh ${priceStr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;
    return `Ksh ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleApprove = async (id: number) => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to approve this purchase order?')) {
      try {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ status: 'Approved', rejection_reason: undefined })
          .eq('id', id);
        
        if (error) throw error;
        
        // Log activity
        const lpo = lpos.find(l => l.id === id);
        await supabase.from('activities').insert([{
          user_id: user?.id || 0,
          user_name: user?.name || 'System',
          user_role: role || 'Admin',
          type: 'LPO Approved',
          description: `Approved LPO for ${lpo?.supplier_name || 'Unknown'} (Total: Ksh ${lpo?.total_amount?.toLocaleString() || '0'})`,
          date: new Date().toISOString(),
          reference_id: id
        }]);
        fetchLPOs();
      } catch (error) {
        console.error("Failed to approve LPO:", error);
      }
    }
  };

  const handleReject = async (id: number) => {
    if (!isAdmin) return;
    const reason = prompt('Please enter the reason for rejection:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A reason is required to reject an LPO.');
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'Rejected',
          rejection_reason: reason 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      const lpo = lpos.find(l => l.id === id);
      await supabase.from('activities').insert([{
        user_id: user?.id || 0,
        user_name: user?.name || 'System',
        user_role: role || 'Admin',
        type: 'LPO Rejected',
        description: `Rejected LPO for ${lpo?.supplier_name || 'Unknown'}. Reason: ${reason}`,
        date: new Date().toISOString(),
        reference_id: id
      }]);
      fetchLPOs();
    } catch (error) {
      console.error("Failed to reject LPO:", error);
    }
  };

  const handleExportCSV = () => {
    if (!filteredLPOs || filteredLPOs.length === 0) return;
    
    const headers = ['LPO ID', 'Date', 'Supplier Name', 'Total Amount', 'Items Count'];
    const csvContent = [
      headers.join(','),
      ...filteredLPOs.map(l => [
        `"LPO-${l.id?.toString().padStart(4, '0')}"`,
        `"${new Date(l.date).toLocaleDateString()}"`,
        `"${l.supplier_name}"`,
        l.total_amount,
        l.items.length
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lpos_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage purchase orders and supplier requests</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by supplier name or LPO ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* LPOs List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">LPO ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedLPOs.map((lpo) => (
                <tr key={lpo.id} className="hover:bg-[#1e293b]/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">
                      LPO-{lpo.id?.toString().padStart(4, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300">
                      {new Date(lpo.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-300">
                      {lpo.supplier_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">
                      {formatPrice(lpo.total_amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      lpo.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      lpo.status === 'Delivered' ? 'bg-blue-500/10 text-blue-500' :
                      lpo.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                      lpo.status === 'Cancelled' ? 'bg-slate-500/10 text-slate-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {lpo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {isAdmin && lpo.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(lpo.id!)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                            title="Approve LPO"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(lpo.id!)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                            title="Reject LPO"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(lpo.status === 'Rejected' || lpo.status === 'Pending') && (
                        <button 
                          onClick={() => {
                            setSelectedLPO(lpo);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                          title="Edit / Resubmit LPO"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedLPO(lpo);
                          setIsViewModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="View LPO"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLPOs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No purchase orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0f172a]/50 px-6 py-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-300">{filteredLPOs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-300">{Math.min(currentPage * itemsPerPage, filteredLPOs.length)}</span> of <span className="font-medium text-slate-300">{filteredLPOs.length}</span> results
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ViewLPOModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        lpo={selectedLPO}
      />

      <CreateLPOModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingLPO={selectedLPO}
      />
    </div>
  );
}
