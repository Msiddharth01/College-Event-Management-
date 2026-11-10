import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AnalyticsSummary, DashboardMetrics } from '../types';
import { getAnalyticsSummary, getDashboardMetrics } from '../api/client';
import { StatusTag } from '../components/StatusTag';
import { useAuth } from '../context/AuthContext';
import { UnauthorizedBanner } from '../components/UnauthorizedBanner';

interface AnalyticsPageProps {
  onNavigateHome?: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigateHome }) => {
  const { user: activeUser } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, metData] = await Promise.all([
        getAnalyticsSummary().catch((e: any) => {
          console.warn('Events summary returned empty or non-critical error:', e?.response || e?.message || e);
          return [] as AnalyticsSummary[];
        }),
        getDashboardMetrics(),
      ]);
      setSummary(Array.isArray(sumData) ? sumData : []);
      setMetrics(metData);
    } catch (err: any) {
      console.error('Analytics connection error:', err?.response || err?.message || err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load analytics from http://localhost:5001/api. Ensure backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Role Guard: Restrict to organizer accounts only
  if (!activeUser || activeUser.role !== 'organizer') {
    return (
      <UnauthorizedBanner
        requiredRole="organizer"
        onNavigateHome={onNavigateHome || (() => {})}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Analytics & System Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time enrollment summaries powered by MongoDB Aggregation Pipeline (Code 4.2).
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center self-start md:self-auto px-3.5 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 shadow-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* High-Level Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Upcoming Events
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {metrics !== null ? (metrics.totalUpcomingEvents ?? metrics.upcomingEvents ?? 0) : (loading ? '...' : 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled campus sessions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Students
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {metrics !== null ? (metrics.totalActiveStudents ?? metrics.activeStudents ?? 0) : (loading ? '...' : 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Eligible student accounts</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              College Venues
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {metrics !== null ? (metrics.totalVenues ?? metrics.collegeVenues ?? 0) : (loading ? '...' : 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Auditoriums & lab facilities</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Registrations
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {metrics !== null ? (metrics.totalConfirmedRegistrations ?? metrics.totalRegistrations ?? 0) : (loading ? '...' : 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed student seats</p>
        </div>
      </div>

      {/* Aggregated Events Summary Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-slate-800">
              Event Registration Summary (Code 4.2 Aggregation)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {summary.length} Events Aggregated
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Running MongoDB aggregation pipeline...</p>
          </div>
        ) : summary.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No confirmed registrations found to aggregate yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Event Title</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Capacity</th>
                  <th className="px-6 py-3.5">Total Registrations</th>
                  <th className="px-6 py-3.5">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {summary.map((item) => {
                  const percent = Math.min(
                    Math.round((item.totalRegistrations / item.capacity) * 100),
                    100
                  );

                  return (
                    <tr key={item.eventId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{item.title}</td>
                      <td className="px-6 py-4">
                        <StatusTag status={item.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.capacity} seats</td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-brand-600 text-sm">
                          {item.totalRegistrations}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">students</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-48 space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{percent}% filled</span>
                            <span>
                              {item.totalRegistrations} / {item.capacity}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percent >= 100
                                  ? 'bg-rose-500'
                                  : percent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-brand-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

