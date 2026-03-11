import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Shield, User as UserIcon, X, Mail, Lock, ChevronDown } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User, type Role } from '../db/db';

export default function Users() {
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New User Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Cashier' as Role,
    password: ''
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      role: formData.role,
      status: 'Active' as const,
      lastLogin: 'Never'
    };
    
    await db.users.add(newUser);
    setIsModalOpen(false);
    setFormData({ firstName: '', lastName: '', email: '', role: 'Cashier', password: '' });
  };

  const handleDeleteUser = async (id: number) => {
    await db.users.delete(id);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 relative">
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black leading-tight tracking-tight">User Management</h1>
          <p className="text-slate-500 text-base font-normal">Manage system access and user roles.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="flex w-full items-center rounded-lg h-12 bg-white border border-primary/10 shadow-sm focus-within:ring-2 focus-within:ring-primary/50 px-4">
            <Search className="text-slate-400 w-5 h-5" />
            <input 
              className="w-full bg-transparent border-none outline-none px-3 text-sm" 
              placeholder="Search users by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto">
          <button className="flex h-12 items-center justify-center gap-x-2 rounded-lg bg-white border border-primary/10 px-4 text-slate-700 hover:border-primary transition-colors whitespace-nowrap">
            <span className="text-sm font-medium">Role: All</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex h-12 items-center justify-center gap-x-2 rounded-lg bg-white border border-primary/10 px-4 text-slate-700 hover:border-primary transition-colors whitespace-nowrap">
            <span className="text-sm font-medium">Status: All</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-primary/10">
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-slate-600 text-sm font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-bold">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {user.role === 'Super Admin' ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-slate-400" />
                      )}
                      <span className={`text-sm font-medium ${user.role === 'Super Admin' ? 'text-primary' : 'text-slate-700'}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}></span>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{user.lastLogin}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => user.id && handleDeleteUser(user.id)}
                        disabled={user.role === 'Super Admin'}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New User</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                >
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    required
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-xs text-slate-500">User will be required to change this upon first login.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors shadow-md shadow-primary/20"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
