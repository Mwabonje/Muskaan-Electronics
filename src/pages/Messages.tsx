import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, type Message, type User } from '../db/db';
import { Mail, Send, Inbox, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function Messages() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [receiverId, setReceiverId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch users for the recipient dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await db.users.toArray();
      // Filter out the current user
      setUsers(allUsers.filter(u => u.id !== user?.id));
    };
    fetchUsers();
  }, [user?.id]);

  // Fetch messages
  const inboxMessages = useLiveQuery(
    () => {
      if (!user?.id) return [];
      return db.messages
        .where('receiverId')
        .equals(user.id)
        .or('receiverId')
        .equals(role === 'Super Admin' ? 'super_admin' : 'all_managers')
        .reverse()
        .sortBy('date');
    },
    [user?.id, role]
  );

  const sentMessages = useLiveQuery(
    () => {
      if (!user?.id) return [];
      return db.messages
        .where('senderId')
        .equals(user.id)
        .reverse()
        .sortBy('date');
    },
    [user?.id]
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user?.id || !user?.name) return;
    if (!receiverId) {
      setErrorMsg('Please select a recipient.');
      return;
    }
    if (!subject.trim() || !content.trim()) {
      setErrorMsg('Subject and content are required.');
      return;
    }

    try {
      const parsedReceiverId = receiverId === 'super_admin' || receiverId === 'all_managers' 
        ? receiverId 
        : Number(receiverId);

      await db.messages.add({
        senderId: user.id,
        senderName: user.name,
        senderRole: role,
        receiverId: parsedReceiverId,
        subject,
        content,
        date: new Date().toISOString(),
        read: false,
        type: 'user'
      });

      setSuccessMsg('Message sent successfully!');
      setSubject('');
      setContent('');
      setReceiverId('');
      setActiveTab('sent');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to send message:', err);
      setErrorMsg('Failed to send message. Please try again.');
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await db.messages.update(id, { read: true });
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getRecipientName = (recId: number | string) => {
    if (recId === 'super_admin') return 'Super Admin';
    if (recId === 'all_managers') return 'All Managers';
    const recipient = users.find(u => u.id === recId);
    return recipient ? recipient.name : 'Unknown User';
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#0f172a] min-h-full text-slate-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-slate-400">Internal communication and system notifications.</p>
        </div>
        <button
          onClick={() => setActiveTab('compose')}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>Compose Message</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <p>{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0B1120] p-4 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'inbox' 
                ? 'bg-blue-600/20 text-blue-400 font-medium' 
                : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-5 h-5" />
              <span>Inbox</span>
            </div>
            {inboxMessages && inboxMessages.filter(m => !m.read).length > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {inboxMessages.filter(m => !m.read).length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'sent' 
                ? 'bg-blue-600/20 text-blue-400 font-medium' 
                : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>Sent</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-0 flex flex-col h-[500px] overflow-y-auto">
          {activeTab === 'compose' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">New Message</h2>
                <button 
                  onClick={() => setActiveTab('inbox')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSendMessage} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">To</label>
                  <select
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="" disabled>Select recipient...</option>
                    {role !== 'Super Admin' && (
                      <option value="super_admin">Super Admin (System Support)</option>
                    )}
                    {role === 'Super Admin' && (
                      <option value="all_managers">All Managers</option>
                    )}
                    <optgroup label="Individual Users">
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter message subject"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-600"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type your message here..."
                    rows={8}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-600 resize-none"
                    required
                  ></textarea>
                </div>
                
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="flex flex-col h-full">
              {(!inboxMessages || inboxMessages.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                  <Inbox className="w-12 h-12 mb-4 opacity-20" />
                  <p>Your inbox is empty.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {inboxMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`p-4 sm:p-6 transition-colors hover:bg-[#0f172a]/50 ${!msg.read ? 'bg-blue-900/10' : ''}`}
                      onClick={() => !msg.read && msg.id && markAsRead(msg.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          {!msg.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>}
                          <h3 className={`font-medium ${!msg.read ? 'text-white' : 'text-slate-300'}`}>
                            {msg.subject}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                          {formatDate(msg.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3 pl-5">
                        <span className="font-medium text-slate-300">{msg.senderName}</span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {msg.senderRole}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 pl-5 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="flex flex-col h-full">
              {(!sentMessages || sentMessages.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                  <Send className="w-12 h-12 mb-4 opacity-20" />
                  <p>You haven't sent any messages yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {sentMessages.map(msg => (
                    <div key={msg.id} className="p-4 sm:p-6 transition-colors hover:bg-[#0f172a]/50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-slate-300">{msg.subject}</h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                          {formatDate(msg.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                        <span>To: <span className="font-medium text-slate-300">{getRecipientName(msg.receiverId)}</span></span>
                      </div>
                      <p className="text-sm text-slate-400 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
