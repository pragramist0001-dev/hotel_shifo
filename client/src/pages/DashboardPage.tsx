import { useState } from 'react';
import { useDashboardStats, useRevenueChart, useOccupancyChart } from '../hooks/useDashboard';
import { useReports } from '../hooks/useReports';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Calendar, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const activeDateRange = dateRange.startDate && dateRange.endDate ? dateRange : undefined;
  
  const { data: stats, isLoading: loadingStats } = useDashboardStats(activeDateRange);
  const { data: revenueData, isLoading: loadingRevenue } = useRevenueChart('7days', activeDateRange);
  const { data: occupancyData, isLoading: loadingOccupancy } = useOccupancyChart();
  const { data: reports } = useReports();
  const navigate = useNavigate();

  if (loadingStats || loadingRevenue || loadingOccupancy) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const applyQuickFilter = (days: number) => {
    if (days === 0) {
      setDateRange({ startDate: '', endDate: '' });
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('dashboard.title')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant={!dateRange.startDate ? "default" : "outline"} className={!dateRange.startDate ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => applyQuickFilter(0)}>{t('common.today')}</Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickFilter(7)}>{t('common.week')}</Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickFilter(30)}>{t('common.month')}</Button>
          </div>
          <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-950/50 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <Input 
                type="date" 
                className="h-9 w-[130px] text-sm" 
                value={dateRange.startDate} 
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <span className="text-zinc-400">-</span>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                className="h-9 w-[130px] text-sm" 
                value={dateRange.endDate} 
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div data-aos="fade-up" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('dashboard.income')}</h3>
          </div>
          <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats?.today?.income?.toLocaleString() || 0} UZS</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t('dashboard.daily_income')}</p>
        </div>
        
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('dashboard.occupied_rooms')}</h3>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats?.rooms?.booked || 0} / {stats?.rooms?.total || 0}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{stats?.rooms?.occupancyRate || 0}% {t('dashboard.occupancy_rate')}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('dashboard.check_ins_today')}</h3>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats?.today?.checkIns || 0}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t('dashboard.new_check_ins')}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('dashboard.check_outs_expected')}</h3>
          </div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats?.today?.expectedCheckOuts || 0}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t('dashboard.check_outs_today')}</p>
        </div>
      </div>
      
      <div data-aos="fade-up" data-aos-delay="100" className="grid gap-4 md:grid-cols-2 lg:grid-cols-8">
        <div className="col-span-3 lg:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md h-96 flex flex-col transition-colors">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-200 mb-4">{t('dashboard.revenue_7days')}</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" vertical={false} />
                <XAxis dataKey="date" stroke="currentColor" className="text-zinc-400" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" className="text-zinc-400" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-3 lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 p-6 shadow-sm backdrop-blur-md h-96 flex flex-col transition-colors">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-200 mb-4">{t('dashboard.room_types')}</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="total"
                  nameKey="type"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
                        {value}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {occupancyData?.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} ta xona (${props.payload.booked} band)`,
                    props.payload.type
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {occupancyData?.map((item: any, index: number) => (
              <div key={item.type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs text-zinc-400 capitalize">{item.type}</span>
                <span className="text-xs text-zinc-500">({item.total})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Xodimlar Hisobotlari Widget */}
        <div className="col-span-2 lg:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/50 shadow-sm backdrop-blur-md h-96 flex flex-col transition-colors overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              {t('dashboard.recent_reports')}
            </h3>
            <button onClick={() => navigate('/reports')} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
              {t('common.all_reports')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {!reports || reports.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                <FileText className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-sm">{t('dashboard.no_reports')}</span>
              </div>
            ) : (
              reports.slice(0, 5).map((r: any) => (
                <div key={r._id} onClick={() => navigate('/reports')} className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {r.author?.fullName}
                    </span>
                    {r.status === 'submitted' ? (
                      <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">{t('reports.pending')}</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{t('reports.seen')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-400 font-bold uppercase">
                      {r.type === 'daily' ? t('reports.daily') : r.type === 'weekly' ? t('reports.weekly') : t('reports.monthly')}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {r.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
