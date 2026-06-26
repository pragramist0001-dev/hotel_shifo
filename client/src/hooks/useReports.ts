import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const useReports = (filter?: Record<string, any>) => {
  return useQuery({
    queryKey: ['reports', filter],
    queryFn: async () => {
      const { data } = await api.get('/reports', { params: filter });
      return data.reports;
    },
  });
};

export const useReportStats = (type: string) => {
  return useQuery({
    queryKey: ['reportStats', type],
    queryFn: async () => {
      const { data } = await api.get('/reports/stats', { params: { type } });
      return data.stats;
    },
    enabled: !!type,
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportData: { type: string; content: string }) => {
      const { data } = await api.post('/reports', reportData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useReviewReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/reports/${id}/status`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { type: string; content: string } }) => {
      const response = await api.put(`/reports/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/reports/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
