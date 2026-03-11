import { Package, AlertTriangle, ShoppingCart, IndianRupee, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

const data = [
  { name: 'MON', value: 4000 },
  { name: 'TUE', value: 3000 },
  { name: 'WED', value: 2000 },
  { name: 'THU', value: 2780 },
  { name: 'FRI', value: 1890 },
  { name: 'SAT', value: 2390 },
  { name: 'SUN', value: 3490 },
];

export default function Dashboard() {
  const productsCount = useLiveQuery(() => db.products.count(), []) || 0;
  const lowStockCount = useLiveQuery(() => db.products.where('status').equals('Low Stock').count(), []) || 0;

  return (
    <div className="p-8 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
              +2.4% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Products</p>
          <p className="text-2xl font-bold text-slate-900">{productsCount}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-amber-600 text-xs font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              Low Stock
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Products Low in Stock</p>
          <p className="text-2xl font-bold text-slate-900">{lowStockCount}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
              +12.3% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Sales Today</p>
          <p className="text-2xl font-bold text-slate-900">156</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
              +8.7% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900">₹45,200</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview Line Chart */}
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sales Overview</h3>
              <p className="text-sm text-slate-500">Weekly revenue performance</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 text-sm font-bold">+14%</span>
              <select className="bg-slate-50 border-none rounded-lg text-xs font-medium focus:ring-primary outline-none">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#741ce9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#741ce9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#741ce9" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Selling Products</h3>
              <p className="text-sm text-slate-500">Units sold this month</p>
            </div>
            <span className="text-primary text-sm font-bold bg-primary/10 px-3 py-1 rounded-lg">480 Total Units</span>
          </div>
          <div className="flex items-end justify-between h-64 gap-4 px-2">
            {[
              { label: 'LED TV', height: '70%', value: 120 },
              { label: 'WASHING MACHINE', height: '45%', value: 85 },
              { label: 'AC', height: '60%', value: 110 },
              { label: 'FRIDGE', height: '90%', value: 165, active: true },
              { label: 'OVEN', height: '35%', value: 60 },
            ].map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div 
                  className={`w-full ${item.active ? 'bg-primary' : 'bg-primary/20 hover:bg-primary'} rounded-t-lg transition-all relative group`} 
                  style={{ height: item.height }}
                >
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.value} Units
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-primary/10 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Recent Sales</h3>
          <button className="text-primary text-sm font-semibold hover:underline">View All Sales</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {[
                { id: '#ORD-8821', customer: 'Rahul Sharma', product: 'Sony Bravia 55" LED TV', date: 'Oct 24, 2023', amount: '₹54,999', status: 'Completed' },
                { id: '#ORD-8820', customer: 'Anita Desai', product: 'LG Front Load Washer', date: 'Oct 24, 2023', amount: '₹32,500', status: 'Processing' },
                { id: '#ORD-8819', customer: 'Vikram Singh', product: 'Samsung Side-by-Side Fridge', date: 'Oct 23, 2023', amount: '₹89,000', status: 'Completed' },
                { id: '#ORD-8818', customer: 'Priya Mehta', product: 'Daikin 1.5 Ton Split AC', date: 'Oct 23, 2023', amount: '₹42,200', status: 'Cancelled' },
                { id: '#ORD-8817', customer: 'Sanjay Gupta', product: 'IFB Convection Microwave', date: 'Oct 22, 2023', amount: '₹15,400', status: 'Completed' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{row.id}</td>
                  <td className="px-6 py-4 text-sm">{row.customer}</td>
                  <td className="px-6 py-4 text-sm">{row.product}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.date}</td>
                  <td className="px-6 py-4 text-sm font-bold">{row.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                      row.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                      row.status === 'Processing' ? 'bg-primary/10 text-primary' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
