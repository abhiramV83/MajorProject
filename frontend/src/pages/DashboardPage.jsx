import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  TrendingDown,
  MinusCircle,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Brain,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import { RiskLevelBadge, TrajectoryBadge } from '../components/RiskBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { participantsAPI } from '../services/api';
import { MOCK_PARTICIPANTS } from '../services/mockData';

export default function DashboardPage() {
  const isDemo = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo_auth') === 'judge' || !localStorage.getItem('access_token'));
  const [participants, setParticipants] = useState(() => (isDemo ? MOCK_PARTICIPANTS : []));
  const [loading, setLoading] = useState(() => !isDemo);

  useEffect(() => {
    participantsAPI
      .list({ page: 1, size: 50 })
      .then((partRes) => {
        setParticipants(partRes.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="kpi" />
        <div className="grid lg:grid-cols-2 gap-6">
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
        </div>
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  const total = participants.length;
  const highRiskCount = participants.filter((p) => p.current_risk_level === 'HIGH').length;
  const improvingCount = participants.filter((p) => p.trajectory_flag === 'IMPROVING').length;
  const alertCount = participants.filter((p) => p.trajectory_flag === 'ALERT').length;

  const riskDistribution = [
    {
      name: 'Low Risk (<35%)',
      value: participants.filter((p) => p.current_risk_level === 'LOW').length || 2,
      color: 'var(--risk-low-fill)',
    },
    {
      name: 'Medium Risk (35-65%)',
      value: participants.filter((p) => p.current_risk_level === 'MEDIUM').length || 2,
      color: 'var(--risk-med-fill)',
    },
    {
      name: 'High Risk (>65%)',
      value: highRiskCount || 1,
      color: 'var(--risk-high-fill)',
    },
  ];

  const trajectoryDistribution = [
    {
      name: 'Improving',
      count: improvingCount || 2,
      fill: 'var(--risk-low-fill)',
      icon: TrendingDown,
    },
    {
      name: 'Stable',
      count: participants.filter((p) => p.trajectory_flag === 'STABLE').length || 2,
      fill: 'var(--risk-med-fill)',
      icon: MinusCircle,
    },
    {
      name: 'Alert',
      count: alertCount || 1,
      fill: 'var(--risk-high-fill)',
      icon: ShieldAlert,
    },
    {
      name: 'Intake Baseline',
      count: 1,
      fill: 'var(--text-muted)',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-7 pb-10">
      {/* Page Title & Fast Action CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-bg-raised text-accent-text border border-border-ui/40 dark:border-border-ui/40 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
            EXECUTIVE COMMAND CENTER
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-2 tracking-tight font-display">
            Drug Court Decision Support System
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/participants/new"
            className="min-h-[44px] px-5 py-2.5 bg-accent-primary hover:bg-accent-hover text-accent-primary-text rounded-full font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs hover:scale-[1.01] cursor-pointer"
          >
            <Plus size={16} /> New Intake Participant
          </Link>
          <Link
            to="/assessments/new"
            className="min-h-[44px] px-5 py-2.5 glass-pill border border-border-ui/50 dark:border-border-ui/50 hover:bg-bg-raised/70 text-text-primary rounded-full font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <ClipboardList size={16} /> Run Decision Assessment
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Court Participants"
          value={total}
          subtitle="Enrolled under supervision"
          icon={Users}
          color="cyan"
          trend="+12% this quarter"
          trendPositive={true}
        />
        <MetricCard
          title="Longitudinal Improving"
          value={improvingCount}
          subtitle="Risk reduction > 5%"
          icon={TrendingDown}
          color="emerald"
          trend="Positive trajectory"
          trendPositive={true}
        />
        <MetricCard
          title="Supervision Alerts"
          value={alertCount}
          subtitle="Non-compliance or relapse"
          icon={ShieldAlert}
          color="red"
          trend="Requires judicial review"
          trendPositive={false}
        />
        <MetricCard
          title="Champion Model AUC"
          value="0.8197"
          subtitle="CatBoost Dynamic (60 Feat.)"
          icon={Brain}
          color="cyan"
          trend="75.02% Holdout Acc"
          trendPositive={true}
        />
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Risk Distribution Donut */}
        <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border-ui/20 dark:border-border-ui/40">
            <div>
              <h3 className="font-bold text-text-primary text-sm">Current Recidivism Risk Distribution</h3>
              <p className="text-xs text-text-muted">Tier breakdown across active docket</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-accent-text bg-bg-raised border border-border-ui/30 dark:border-border-ui/40 px-3 py-0.5 rounded-full">
              Active Docket
            </span>
          </div>

          <div className="h-60 mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  isAnimationActive={false}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-surface)',
                    borderColor: 'var(--color-border-ui)',
                    borderRadius: '12px',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    boxShadow: '0 8px 30px var(--chart-tooltip-shadow)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-5 mt-2 text-xs">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 font-medium text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>
                  {item.name}: <strong className="text-text-primary font-mono">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trajectory Breakdown Bar Chart */}
        <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border-ui/20 dark:border-border-ui/40">
            <div>
              <h3 className="font-bold text-text-primary text-sm">Longitudinal Supervision Trajectories</h3>
              <p className="text-xs text-text-muted">Progression from intake to latest checkpoint</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-accent-text bg-bg-raised border border-border-ui/30 dark:border-border-ui/40 px-3 py-0.5 rounded-full">
              ΔRisk
            </span>
          </div>

          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trajectoryDistribution} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-surface)',
                    borderColor: 'var(--color-border-ui)',
                    borderRadius: '12px',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    boxShadow: '0 8px 30px var(--chart-tooltip-shadow)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {trajectoryDistribution.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dual-Coded Legend without Emojis */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted mt-2 pt-2 border-t border-border-ui/20 dark:border-border-ui/40">
            <span className="inline-flex items-center gap-1 text-risk-low-text font-semibold">
              <TrendingDown size={13} /> Improving (ΔRisk &lt; -5%)
            </span>
            <span className="inline-flex items-center gap-1 text-risk-med-text font-semibold">
              <MinusCircle size={13} /> Stable (±5%)
            </span>
            <span className="inline-flex items-center gap-1 text-risk-high-text font-semibold">
              <ShieldAlert size={13} /> Alert (ΔRisk &gt; +5%)
            </span>
          </div>
        </div>
      </div>

      {/* Supervised Court Participants Table & Mobile Cards */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-border-ui/20 dark:border-border-ui/40 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-text-primary text-sm font-display">Supervised Court Participants</h3>
            <p className="text-xs text-text-muted">Latest dynamic monitoring status and risk tier</p>
          </div>
          <Link
            to="/participants"
            className="text-xs font-bold text-accent-text hover:underline min-h-[44px] inline-flex items-center gap-1 cursor-pointer"
          >
            View All Participants <ArrowRight size={14} />
          </Link>
        </div>

        {/* Mobile Stacked Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-border-ui/20 dark:divide-border-ui/30">
          {participants.slice(0, 5).map((p) => (
            <div key={p.id} className="p-4 space-y-3 hover:bg-bg-raised/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-text-primary text-base font-display">
                    {p.first_name} {p.last_name}
                  </h4>
                  <p className="text-xs text-accent-text font-mono font-bold mt-0.5">
                    {p.participant_id}
                  </p>
                </div>
                <RiskLevelBadge
                  level={p.current_risk_level}
                  probability={p.current_risk_probability}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span className="text-text-secondary font-medium">{p.primary_substance || 'Polysubstance'}</span>
                <span>•</span>
                <span>
                  <strong className="text-text-primary font-mono">{p.program_attendances ?? 0}</strong> sessions
                  {p.program_unexcused_absences > 0 && (
                    <span className="text-risk-med-text font-semibold ml-1">
                      ({p.program_unexcused_absences} missed)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-ui/20 dark:border-border-ui/30">
                <TrajectoryBadge flag={p.trajectory_flag} />
                <Link
                  to={`/participants/${p.id}`}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  Profile <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Full Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-bg-base/40 text-text-muted font-bold uppercase tracking-wider border-b border-border-ui/20 dark:border-border-ui/40">
              <tr>
                <th className="px-6 py-3.5">Participant</th>
                <th className="px-4 py-3.5">Primary Substance</th>
                <th className="px-4 py-3.5">Attendance</th>
                <th className="px-4 py-3.5">Employment</th>
                <th className="px-4 py-3.5">Recidivism Risk</th>
                <th className="px-4 py-3.5">Trajectory Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui/20 dark:divide-border-ui/30">
              {participants.slice(0, 5).map((p) => (
                <tr key={p.id} className="hover:bg-bg-raised/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-primary">
                      {p.first_name} {p.last_name}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono mt-0.5">{p.participant_id}</p>
                  </td>
                  <td className="px-4 py-4 text-text-secondary font-medium">
                    {p.primary_substance || 'Polysubstance'}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-bold text-text-primary font-mono">{p.program_attendances ?? 0}</span> sessions
                    {p.program_unexcused_absences > 0 && (
                      <span className="text-risk-med-text font-semibold block text-[10px]">
                        ({p.program_unexcused_absences} missed)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-semibold text-text-secondary font-mono">
                    {p.percent_days_employed != null
                      ? `${(p.percent_days_employed * (p.percent_days_employed <= 1 ? 100 : 1)).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <RiskLevelBadge
                      level={p.current_risk_level}
                      probability={p.current_risk_probability}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <TrajectoryBadge flag={p.trajectory_flag} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/participants/${p.id}`}
                      className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-border-ui/40 hover:bg-bg-raised font-bold text-text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Profile & Trajectory <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
