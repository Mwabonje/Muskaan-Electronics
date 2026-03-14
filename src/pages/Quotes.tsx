import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock 
} from 'lucide-react';
import ViewQuoteModal from '../components/ViewQuoteModal';

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('quotes').select('*').order('date', { ascending: false });
      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'All' || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: number, newStatus: 'Pending' | 'Accepted' | 'Rejected') => {
    try {
      const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      fetchQuotes(); // Refresh list
    } catch (error) {
      console.error("Failed to update quote status:", error);
    }
  };

  const handleExportCSV = () => {
    if (!filteredQuotes || filteredQuotes.length === 0) return;
    
    const headers = ['Quote ID', 'Date', 'Customer Name', 'Status', 'Total Amount', 'Items Count'];
    const csvContent = [
      headers.join(','),
      ...filteredQuotes.map(q => [
        `"Q-${q.id?.toString().padStart(4, '0')}"`,
        `"${new Date(q.date).toLocaleDateString()}"`,
        `"${q.customer_name || 'Walk-in'}"`,
        `"${q.status}"`,
        q.total_amount,
        q.items.length
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `quotes_export_${new Date().toISOString().split('T')[0]}.csv`);
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
            <FileText className="w-6 h-6 text-blue-500" />
            Quotes & Estimates
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage and track customer quotes</p>
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
            placeholder="Search by customer name or quote ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-[#0B1120] border border-slate-800 rounded-xl p-1">
          {['All', 'Pending', 'Accepted', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0f172a]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Quote ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredQuotes.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-base font-medium text-slate-400">No quotes found</p>
                    <p className="text-sm mt-1">Generate a new quote from the Dashboard.</p>
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-base font-medium text-slate-400">Loading quotes...</p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-[#0f172a]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-blue-400">#{quote.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {new Date(quote.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(quote.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-200">
                        {quote.customer_name || 'Walk-in Customer'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">
                        Ksh {Number(quote.total_amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {quote.status === 'Pending' && <Clock className="w-4 h-4 text-amber-500" />}
                        {quote.status === 'Accepted' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {quote.status === 'Rejected' && <XCircle className="w-4 h-4 text-rose-500" />}
                        <select
                          value={quote.status}
                          onChange={(e) => handleStatusChange(quote.id!, e.target.value as any)}
                          className={`px-2 py-1 rounded text-xs font-bold bg-transparent border border-slate-700 focus:ring-0 cursor-pointer ${
                            quote.status === 'Pending' ? 'text-amber-500' :
                            quote.status === 'Accepted' ? 'text-emerald-500' :
                            'text-rose-500'
                          }`}
                        >
                          <option value="Pending" className="bg-slate-900 text-amber-500">Pending</option>
                          <option value="Accepted" className="bg-slate-900 text-emerald-500">Accepted</option>
                          <option value="Rejected" className="bg-slate-900 text-rose-500">Rejected</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedQuote(quote)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <ViewQuoteModal 
        isOpen={!!selectedQuote} 
        onClose={() => setSelectedQuote(null)} 
        quote={selectedQuote} 
      />
    </div>
  );
}
