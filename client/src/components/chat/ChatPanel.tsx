import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatMessages, useSendMessage, useUpdateMessage, useDeleteMessage, useChatUsers } from '../../hooks/useChat';
import { useSocketStore } from '../../stores/useSocketStore';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Edit2, Trash2, X, MessageSquare, Loader2, MoreVertical, ArrowLeft, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

export default function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: users, isLoading: loadingUsers } = useChatUsers();
  const { data: messages, isLoading } = useChatMessages(selectedUser?._id || null);
  const sendMessage = useSendMessage();
  const updateMessage = useUpdateMessage();
  const deleteMessage = useDeleteMessage();

  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Real-time: yangi xabar kelganda chat querylarini yangilash
  useEffect(() => {
    if (!socket) return;

    const handleChatUpdate = () => {
      // Barcha chat suhbatlarni yangilash
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    };

    socket.on('chat:update', handleChatUpdate);
    return () => {
      socket.off('chat:update', handleChatUpdate);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (editingId) {
      updateMessage.mutate({ id: editingId, content: input.trim() }, {
        onSuccess: () => {
          setEditingId(null);
          setInput('');
        }
      });
    } else {
      sendMessage.mutate({ receiverId: selectedUser._id, content: input.trim() }, {
        onSuccess: () => {
          setInput('');
        }
      });
    }
  };

  const handleEdit = (msg: any) => {
    setEditingId(msg._id);
    setInput(msg.content);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('chat.delete_msg_confirm', "Xabarni o'chirasizmi?"))) {
      deleteMessage.mutate(id);
      if (editingId === id) {
        setEditingId(null);
        setInput('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white dark:bg-zinc-950 shadow-2xl z-50 flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md">
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedUser(null)} className="p-1.5 mr-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                {selectedUser.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{selectedUser.fullName}</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium capitalize">{selectedUser.role}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{t('chat.conversations', 'Suhbatlar')}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('chat.who_to_write', 'Kimga yozmoqchisiz?')}</p>
              </div>
            </div>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedUser ? (
          // Odamlarni tanlash ro'yxati
          <div className="flex-1 overflow-y-auto p-2 bg-zinc-50/30 dark:bg-zinc-950/30">
            {loadingUsers ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
            ) : !users || users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <UsersIcon className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">{t('chat.no_other_users', "Boshqa foydalanuvchilar yo'q")}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((u: any) => (
                  <button 
                    key={u._id} 
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-zinc-900 hover:shadow-sm border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex flex-shrink-0 items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{u.fullName}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{u.role === 'admin' ? t('staff.admin_role', '👑 Admin') : t('staff.staff_role', 'Xodim')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Chat View
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/30 dark:bg-zinc-950/30">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
              ) : !messages || messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">{t('chat.no_messages_yet', "Hozircha xabarlar yo'q")}</p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isMine = msg.sender._id === user?._id;
                  
                  return (
                    <div key={msg._id} className={cn("flex flex-col max-w-[85%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className={cn(
                        "relative group px-4 py-2.5 rounded-2xl text-sm",
                        isMine 
                          ? "bg-emerald-600 text-white rounded-br-sm" 
                          : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-bl-sm border border-zinc-200 dark:border-zinc-800"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={cn(
                          "flex items-center gap-1.5 mt-1 text-[9px]",
                          isMine ? "text-emerald-100 justify-end" : "text-zinc-400"
                        )}>
                          {msg.isEdited && <span>{t('chat.edited', '(tahrirlangan)')}</span>}
                          <span>{new Date(msg.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Actions Dropdown for my messages */}
                        {(isMine || user?.role === 'admin') && (
                          <div className={cn(
                            "absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity",
                            isMine ? "-left-8" : "-right-8"
                          )}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 outline-none">
                                <MoreVertical className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isMine ? "end" : "start"} className="min-w-[120px]">
                                {isMine && (
                                  <DropdownMenuItem onClick={() => handleEdit(msg)} className="cursor-pointer text-blue-600 focus:text-blue-600">
                                    <Edit2 className="w-3.5 h-3.5 mr-2" /> {t('common.edit', 'Tahrirlash')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDelete(msg._id)} className="cursor-pointer text-red-600 focus:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('common.delete', "O'chirish")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              {editingId && (
                <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('chat.editing_msg', 'Xabarni tahrirlash...')}</span>
                  <button onClick={() => { setEditingId(null); setInput(''); }} className="text-blue-600 hover:text-blue-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chat.type_message', 'Xabar yozing...')}
                  className="flex-1 max-h-32 min-h-[44px] bg-zinc-100 dark:bg-zinc-900 border-transparent focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm resize-none outline-none dark:text-zinc-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || sendMessage.isPending || updateMessage.isPending}
                  className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 disabled:hover:bg-emerald-600"
                >
                  {(sendMessage.isPending || updateMessage.isPending) ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-1" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
