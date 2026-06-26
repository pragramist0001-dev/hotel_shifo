import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/useSocketStore';

export const useRealTimeEvents = () => {
  const { socket } = useSocketStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.on('room:statusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('booking:newCheckIn', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('booking:checkOut', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('booking:update', () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('dashboard:update', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    });

    socket.on('transaction:new', () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('chat:update', () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    });

    socket.on('staff:update', () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['chatUsers'] });
    });

    socket.on('report:new', () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    });

    return () => {
      socket.off('room:statusChanged');
      socket.off('booking:newCheckIn');
      socket.off('booking:checkOut');
      socket.off('booking:update');
      socket.off('dashboard:update');
      socket.off('transaction:new');
      socket.off('chat:update');
      socket.off('staff:update');
      socket.off('report:new');
    };
  }, [socket, queryClient]);
};
