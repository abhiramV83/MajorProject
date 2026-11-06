import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowRight,
  RefreshCw,
  Users,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { RiskLevelBadge, TrajectoryBadge } from '../components/RiskBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import TablePagination from '../components/TablePagination';
import { participantsAPI } from '../services/api';
import { MOCK_PARTICIPANTS } from '../services/mockData';
import toast from 'react-hot-toast';

export default function ParticipantsPage() {
  const isDemo = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo_auth') === 'judge' || !localStorage.getItem('access_token'));
  const [data, setData] = useState(() => ({
    items: isDemo ? MOCK_PARTICIPANTS.slice(0, 10) : [],
    total: isDemo ? MOCK_PARTICIPANTS.length : 0,
    page: 1,
    size: 10,
  }));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(() => !isDemo);

  const load = useCallback(() => {
    setLoading(true);
    participantsAPI
      .list({
        search: search || undefined,
        program_status: status || undefined,
        risk_level: riskFilter || undefined,
        page: currentPage,
        size: 10,
      })
      .then((res) => {
        if (res?.data) setData(res.data);
      })
      .catch(() => {
        // Fallback for resilient standalone demonstration
        let filtered = [...MOCK_PARTICIPANTS];
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.first_name.toLowerCase().includes(q) ||
              p.last_name.toLowerCase().includes(q) ||
              p.participant_id.toLowerCase().includes(q)
          );
        }
        if (status) filtered = filtered.filter((p) => p.program_status === status);
        if (riskFilter) filtered = filtered.filter((p) => p.current_risk_level === riskFilter);
        setData({
          items: filtered.slice((currentPage - 1) * 10, currentPage * 10),
          total: filtered.length,
          page: currentPage,
          size: 10,
        });
      })
      .finally(() => setLoading(false));
  }, [search, status, riskFilter, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  const items = data.items || [];
  const total = data.total || items.length;
  const pageSize = data.size || 10;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-bg-raised text-accent-text border border-border-ui/40 dark:border-border-ui/40 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
            JUDICIAL DIRECTORY
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-2 tracking-tight font-display">
            Court Participants & Supervision Docket
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage demographics, baseline criminal history, and ongoing dynamic compliance data.
          </p>
        </div>

        <Link
          to="/participants/new"
          className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-2 transition-all self-start md:self-center shadow-xs hover:scale-[1.01] cursor-pointer"
        >
          <Plus size={16} /> Register New Intake
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-2xl p-4 shadow-xs">
        <div className="grid md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none" size={17} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search by participant name or ID (e.g. DC-100001)..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
            />
          </div>

          {/* Risk Level Filter */}
          <div className="md:col-span-3">
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
            >
              <option value="">All Risk Tiers</option>
              <option value="LOW">Low Risk (&lt;35%)</option>
              <option value="MEDIUM">Medium Risk (35-65%)</option>
              <option value="HIGH">High Risk (&gt;65%)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Supervision</option>
              <option value="Pending">Pending Review</option>
              <option value="Graduated">Graduated</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>

          {/* Apply Filter Button */}
          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={load}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl glass-pill border border-border-ui/40 dark:border-border-ui/40 hover:bg-bg-raised text-text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-accent-text' : 'text-text-muted'} />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Participants Table Container */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={6} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Participants Found"
            description="No active supervision records matched your search query or filter criteria."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch('');
              setStatus('');
              setRiskFilter('');
              setCurrentPage(1);
            }}
          />
        ) : (
          <div>
            {/* Mobile Stacked Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-border-ui/20 dark:divide-border-ui/30">
              {items.map((p) => (
                <div key={p.id} className="p-4 space-y-3 hover:bg-bg-raised/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-text-primary text-base font-display">
                        {p.first_name} {p.last_name}
                      </h3>
                      <p className="text-xs text-accent-text font-mono font-bold mt-0.5">
                        {p.participant_id}
                      </p>
                    </div>
                    <RiskLevelBadge
                      level={p.current_risk_level}
                      probability={p.current_risk_probability}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span>{p.gender || '—'} · {p.age ? `${p.age} yrs` : 'Age N/A'} · {p.race || '—'}</span>
                    <span>•</span>
                    <span className="text-text-secondary font-medium">{p.primary_substance || 'Polysubstance'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-bg-base/60 dark:bg-bg-raised/40 border border-border-ui/20 text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-mono block">Supervision</span>
                      <span className="font-bold text-text-primary font-mono">{p.program_attendances ?? 0}</span> sessions
                      {p.program_unexcused_absences > 0 && (
                        <span className="text-rose-500 font-semibold ml-1">({p.program_unexcused_absences} missed)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-mono block">Employment</span>
                      <span className="font-bold text-text-primary font-mono">
                        {p.percent_days_employed != null
                          ? `${(p.percent_days_employed * (p.percent_days_employed <= 1 ? 100 : 1)).toFixed(0)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <TrajectoryBadge flag={p.trajectory_flag} />
                    <Link
                      to={`/participants/${p.id}`}
                      className="min-h-[44px] px-4 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      View Profile <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Full Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-base/40 text-text-muted font-bold uppercase tracking-wider border-b border-border-ui/20 dark:border-border-ui/40">
                  <tr>
                    <th className="px-6 py-3.5">Participant & Demographics</th>
                    <th className="px-4 py-3.5">Primary Substance</th>
                    <th className="px-4 py-3.5">Dynamic Supervision Stats</th>
                    <th className="px-4 py-3.5">Current Recidivism Risk</th>
                    <th className="px-4 py-3.5">Longitudinal Trajectory</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui/20 dark:divide-border-ui/30">
                  {items.map((p) => (
                    <tr key={p.id} className="hover:bg-bg-raised/40 transition-colors">
                      {/* Participant Details */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-primary text-sm font-display">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-[11px] text-accent-text font-mono font-bold mt-0.5">
                          {p.participant_id}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {p.gender || '—'} · {p.age ? `${p.age} yrs` : 'Age N/A'} · {p.race || '—'}
                        </p>
                      </td>

                      {/* Substance */}
                      <td className="px-4 py-4 font-medium text-text-secondary">
                        {p.primary_substance || p.substance_use_frequency || 'Polysubstance'}
                      </td>

                      {/* Dynamic Compliance */}
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-[11px]">
                          <span className="flex items-center gap-1.5 text-text-secondary">
                            <Calendar size={13} className="text-accent-text" />
                            <strong className="text-text-primary font-mono">{p.program_attendances ?? 0}</strong> attendances
                            {p.program_unexcused_absences > 0 && (
                              <span className="text-text-muted font-medium ml-1">
                                ({p.program_unexcused_absences} missed)
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 text-text-secondary">
                            <Briefcase size={13} className="text-accent-text" />
                            <strong className="text-text-primary font-mono">
                              {p.percent_days_employed != null
                                ? `${(p.percent_days_employed * (p.percent_days_employed <= 1 ? 100 : 1)).toFixed(0)}%`
                                : '0%'}
                            </strong>{' '}
                            employed
                          </span>
                        </div>
                      </td>

                      {/* Risk Level */}
                      <td className="px-4 py-4">
                        <RiskLevelBadge
                          level={p.current_risk_level}
                          probability={p.current_risk_probability}
                        />
                      </td>

                      {/* Trajectory Flag */}
                      <td className="px-4 py-4">
                        <TrajectoryBadge flag={p.trajectory_flag} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/participants/${p.id}`}
                            className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-border-ui/40 hover:bg-bg-raised font-bold text-xs text-text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            Profile & Trajectory <ArrowRight size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table Pagination */}
        {!loading && items.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
          />
        )}
      </div>
    </div>
  );
}
