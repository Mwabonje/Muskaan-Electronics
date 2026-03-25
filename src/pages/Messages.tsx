import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db, type User } from "../db/db";
import { Search, Settings, Smile, Paperclip, Send, User as UserIcon, Trash2 } from "lucide-react";
import { useLiveQuery } from "../hooks/useLiveQuery";

export default function Messages() {
  const { user, role } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await db.users.toArray();
      setUsers(allUsers.filter((u) => u.id !== user?.id));
    };
    fetchUsers();
  }, [user?.id]);

  // Fetch all messages
  const allMessages = useLiveQuery(async () => {
    if (!user?.id) return [];
    const msgs = await db.messages.toArray();
    return msgs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [user?.id]);

  // Filter messages for selected conversation
  const conversationMessages = allMessages?.filter((m) => {
    if (!selectedUserId) return false;
    const isFromMeToThem = String(m.senderId) === String(user?.id) && String(m.receiverId) === String(selectedUserId);
    const isFromThemToMe = String(m.senderId) === String(selectedUserId) && String(m.receiverId) === String(user?.id);
    return isFromMeToThem || isFromThemToMe;
  }) || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user?.name || !selectedUserId || !newMessage.trim()) return;

    try {
      const messageContent = newMessage.trim();
      
      await db.messages.add({
        senderId: user.id,
        senderName: user.name,
        senderRole: role,
        receiverId: selectedUserId,
        subject: "Chat Message",
        content: messageContent,
        date: new Date().toISOString(),
        read: false,
        type: "user",
      });
      setNewMessage("");

      // Send email notification
      const recipient = users.find((u) => String(u.id) === String(selectedUserId));
      if (recipient && recipient.email) {
        fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: recipient.email,
            subject: `New message from ${user.name}`,
            text: `You have a new message from ${user.name}:\n\n"${messageContent}"\n\nLog in to reply.`,
          }),
        }).catch(err => console.error("Failed to send email notification:", err));
      }

    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleUnsend = async (messageId: number) => {
    try {
      await db.messages.delete(messageId);
    } catch (err) {
      console.error("Failed to unsend message:", err);
    }
  };

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));
  };

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  // Mark as read
  useEffect(() => {
    if (selectedUserId && conversationMessages.length > 0) {
      conversationMessages.forEach(async (msg) => {
        if (String(msg.receiverId) === String(user?.id) && !msg.read && msg.id) {
          await db.messages.update(msg.id, { read: true });
        }
      });
    }
  }, [selectedUserId, conversationMessages, user?.id]);

  return (
    <div className="p-0 sm:p-4 md:p-8 h-[calc(100vh-4rem)] bg-[#0f172a]">
      <div className="bg-white sm:rounded-2xl overflow-hidden flex h-full shadow-2xl relative">
        {/* Sidebar (Users List) */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col bg-white shrink-0 absolute md:relative z-10 h-full transition-transform duration-300 ${selectedUserId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {users.map((u) => {
              const unreadCount = allMessages?.filter(m => String(m.senderId) === String(u.id) && String(m.receiverId) === String(user?.id) && !m.read).length || 0;
              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id!)}
                  className={`p-3 sm:p-4 border-b border-slate-50 cursor-pointer flex items-center gap-3 sm:gap-4 transition-colors ${String(selectedUserId) === String(u.id) ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} className="w-full h-full object-cover" />
                    </div>
                    {u.status === 'Active' && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate text-sm sm:text-base">{u.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 truncate">{u.role}</p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white text-[10px] sm:text-xs flex items-center justify-center font-bold">
                      {unreadCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-white w-full h-full absolute md:relative top-0 left-0 transition-opacity duration-300 ${selectedUserId ? 'opacity-100 z-20' : 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto md:z-0'}`}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="h-16 sm:h-20 border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={() => setSelectedUserId(null)}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`} alt={selectedUser.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-base sm:text-lg">{selectedUser.name}</h2>
                    <p className="text-xs sm:text-sm text-slate-500">Active Now</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 text-slate-400">
                  <button className="hover:text-slate-600 transition-colors hidden sm:block"><Search className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                  <button className="hover:text-slate-600 transition-colors"><Settings className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-white">
                {conversationMessages.map((msg) => {
                  const isMe = String(msg.senderId) === String(user?.id);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 sm:gap-4 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden mb-1 hidden sm:flex">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt={msg.senderName} className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      {isMe && (
                        <span className="text-[10px] sm:text-xs text-slate-400 mb-2 font-medium hidden sm:block">
                          {formatTime(msg.date)}
                        </span>
                      )}

                      {isMe && (
                        <button
                          onClick={() => msg.id && handleUnsend(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-1 mb-2"
                          title="Unsend message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div 
                        className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-[15px] max-w-[85%] sm:max-w-[60%] shadow-sm ${
                          isMe 
                            ? 'bg-[#f8f9fa] text-slate-700 rounded-2xl sm:rounded-3xl rounded-tr-sm' 
                            : 'bg-[#eef2ff] text-slate-700 rounded-2xl sm:rounded-3xl rounded-tl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {!isMe && (
                        <span className="text-[10px] sm:text-xs text-slate-400 mb-2 font-medium hidden sm:block">
                          {formatTime(msg.date)}
                        </span>
                      )}

                      {isMe && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden mb-1 hidden sm:flex">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt={user?.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 sm:p-6 bg-white border-t border-slate-100 sm:border-none">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-4">
                  <div className="flex-1 text-sm sm:text-[15px] bg-slate-50 sm:bg-transparent rounded-full sm:rounded-none px-4 sm:px-0 py-1 sm:py-0 border border-slate-200 sm:border-none">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message"
                      className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-2 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:gap-5 text-slate-400 px-1 sm:px-2">
                    <button type="button" className="hover:text-slate-600 transition-colors hidden sm:block"><Smile className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                    <button type="button" className="hover:text-slate-600 transition-colors"><Paperclip className="w-5 h-5" /></button>
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#3b82f6] hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full sm:rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <span className="hidden sm:inline">Send</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 items-center justify-center text-slate-400 bg-slate-50/50 hidden md:flex flex-col">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <UserIcon className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-lg font-medium text-slate-500">Select a user to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
