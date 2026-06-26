import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const useChatUsers = () => {
  return useQuery({
    queryKey: ['chatUsers'],
    queryFn: async () => {
      const { data } = await api.get('/chat/users');
      return data.users;
    },
  });
};

export const useChatMessages = (userId: string | null) => {
  return useQuery({
    queryKey: ['chat', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await api.get('/chat', { params: { userId } });
      return data.messages;
    },
    enabled: !!userId,
    staleTime: 0, // Socket orqali invalidate bo'lganda darhol yangilash
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const { data } = await api.post('/chat', { receiverId, content });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
};

export const useUpdateMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data } = await api.put(`/chat/${id}`, { content });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/chat/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
};
