import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useRoomById = (id: string | null) => {
  return useQuery({
    queryKey: ['room', id],
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${id}`);
      return data; // { room, maintenanceDays }
    },
    enabled: !!id,
  });
};
