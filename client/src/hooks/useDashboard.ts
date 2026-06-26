import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useDashboardStats = (dateRange?: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard', 'stats', dateRange?.startDate, dateRange?.endDate],
    queryFn: async () => {
      const params = dateRange?.startDate && dateRange?.endDate 
        ? { startDate: dateRange.startDate, endDate: dateRange.endDate } 
        : undefined;
      const { data } = await api.get('/dashboard/stats', { params });
      return data;
    },
  });
};

export const useRevenueChart = (period: string = '7days', dateRange?: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard', 'revenueChart', period, dateRange?.startDate, dateRange?.endDate],
    queryFn: async () => {
      const params: any = { period };
      if (dateRange?.startDate && dateRange?.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }
      const { data } = await api.get('/dashboard/revenue-chart', { params });
      return data.chartData;
    },
  });
};

export const useOccupancyChart = () => {
  return useQuery({
    queryKey: ['dashboard', 'occupancyChart'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/occupancy');
      return data.occupancyData;
    },
  });
};
