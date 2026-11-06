import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  MessageSquare,
  Pencil,
  AlertTriangle,
  Activity,
  Calendar,
  Briefcase,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { RiskLevelBadge, TrajectoryBadge } from '../components/RiskBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { participantsAPI, assessmentsAPI, interventionsAPI } from '../services/api';
import { MOCK_PARTICIPANTS, MOCK_ASSESSMENTS, MOCK_INTERVENTION_PLANS, MOCK_TRAJECTORIES } from '../services/mockData';
import toast from 'react-hot-toast';

export default function ParticipantProfilePage() {
  const { participantId } = useParams();
  const navigate = useNavigate();

  const isDemo = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo_auth') === 'judge' || !localStorage.getItem('access_token'));
  const fallbackParticipant = MOCK_PARTICIPANTS.find((x) => String(x.id) === String(participantId)) || MOCK_PARTICIPANTS[0];

  const [p, setP] = useState(() => (isDemo ? fallbackParticipant : null));
  const [assessments, setAssessments] = useState(() => (isDemo ? MOCK_ASSESSMENTS.filter((a) => a.participant_id === Number(participantId)) : []));
  const [trajectories, setTrajectories] = useState(() => {
    if (isDemo && MOCK_TRAJECTORIES[participantId]) {
      return MOCK_TRAJECTORIES[participantId].map((t) => ({
        ...t,
        risk_probability: Math.round(t.risk_probability * 1000) / 10,
        date: `CP-${t.checkpoint_number}`,
      }));
    }
    return [];
  });
  const [notes, setNotes] = useState([]);
  const [plans, setPlans] = useState(() => (isDemo ? MOCK_INTERVENTION_PLANS.filter((pl) => pl.participant_id === Number(participantId)) : []));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(() => !isDemo);

  const synthesizeTrajectories = useCallback((assessList) => {
    if (!assessList || assessList.length === 0) {
      if (MOCK_TRAJECTORIES[participantId]) {
        setTrajectories(
          MOCK_TRAJECTORIES[participantId].map((t) => ({
            ...t,
            risk_probability: Math.round(t.risk_probability * 1000) / 10,
            date: `CP-${t.checkpoint_number}`,
          }))
        );
        return;
      }
      setTrajectories([]);
      return;
    }
    const points = assessList.map((a, idx) => {
      const dateStr = a.assessment_date
        ? new Date(a.assessment_date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : `Eval #${a.id}`;
      const prob =
        a.recidivism_probability != null
          ? Math.round(a.recidivism_probability * 1000) / 10
          : 50.0;
      return {
        id: a.id,
        assessment_id: a.id,
        date: dateStr,
        stage: a.assessment_stage || (idx === 0 ? 'INTAKE' : 'DYNAMIC'),
        risk_probability: prob,
        risk_level: a.risk_level || 'MEDIUM',
        delta_risk: a.delta_risk != null ? a.delta_risk : 0.0,
        trajectory_flag: a.trajectory_flag || (idx === 0 ? 'BASELINE' : 'STABLE'),
      };
    });
    setTrajectories(points);
  }, [participantId]);

  const load = useCallback(async () => {
    try {
      const [partRes, assessRes, notesRes, plansRes] = await Promise.all([
        participantsAPI.get(participantId),
        assessmentsAPI.getForParticipant(participantId),
        participantsAPI.getNotes(participantId),
        interventionsAPI.getForParticipant(participantId),
      ]);

      if (partRes?.data) setP(partRes.data);
      const sortedAssessments = (assessRes?.data || []).sort(
        (a, b) => new Date(a.assessment_date) - new Date(b.assessment_date)
      );
      setAssessments(sortedAssessments);
      setNotes(notesRes?.data || []);
      setPlans(plansRes?.data || []);

      try {
        const trajRes = await participantsAPI.getTrajectory(participantId);
        if (trajRes.data && trajRes.data.length > 0) {
          const chartPoints = trajRes.data.map((t) => ({
            ...t,
            date: new Date(t.recorded_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
            risk_probability: Math.round(t.risk_probability * 1000) / 10,
          }));
          setTrajectories(chartPoints);
        } else {
          synthesizeTrajectories(sortedAssessments);
        }
      } catch {
        synthesizeTrajectories(sortedAssessments);
      }
    } catch {
      // Fallback for demo
      setP((prev) => prev || fallbackParticipant);
      synthesizeTrajectories(MOCK_ASSESSMENTS.filter((a) => a.participant_id === Number(participantId)));
    } finally {
      setLoading(false);
    }
  }, [participantId, synthesizeTrajectories, fallbackParticipant]);

  useEffect(() => {
    load();
  }, [load]);

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await participantsAPI.addNote(participantId, {
        note_type: 'general',
        content: note,
      });
      setNotes((prev) => [
        {
          id: Date.now(),
          content: note,
          created_at: new Date().toISOString(),
          author_id: 1,
        },
        ...prev,
      ]);
      setNote('');
      toast.success('Clinical progress note recorded');
    } catch {
      setNotes((prev) => [
        {
          id: Date.now(),
          content: note,
          created_at: new Date().toISOString(),
          author_id: 1,
        },
        ...prev,
      ]);
      setNote('');
      toast.success('Progress note recorded (demonstration mode)');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="chart" />
        <div className="grid lg:grid-cols-2 gap-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  const activeP = p || fallbackParticipant;
  const latestAssessment = assessments[assessments.length - 1];
  const intakeAssessment = assessments[0];
  const hasMultiple = assessments.length > 1;

  let deltaRisk = 0;
  let trajectoryStatus = activeP.trajectory_flag || 'BASELINE';
  if (hasMultiple && latestAssessment && intakeAssessment) {
    const intakeP = intakeAssessment.recidivism_probability || 0;
    const latestP = latestAssessment.recidivism_probability || 0;
    deltaRisk = (latestP - intakeP) * 100;
    if (deltaRisk < -5) trajectoryStatus = 'IMPROVING';
    else if (deltaRisk > 5) trajectoryStatus = 'ALERT';
    else trajectoryStatus = 'STABLE';
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/participants"
          className="min-h-[44px] text-xs text-text-muted hover:text-text-primary transition-colors inline-flex gap-2 items-center font-bold"
        >
          <ArrowLeft size={16} /> Return to Participants Directory
        </Link>
        <span className="text-[11px] px-3 py-1 rounded-full bg-bg-raised border border-border-ui/40 dark:border-border-ui/40 text-text-muted font-mono font-bold">
          System Record ID: #{activeP.id}
        </span>
      </div>

      {/* Participant Banner Card */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-bg-raised text-accent-text border border-border-ui/40 dark:border-border-ui/40 font-extrabold uppercase tracking-wider font-mono">
                {activeP.participant_id}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-bg-raised/60 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 font-medium text-text-primary">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    activeP.program_status === 'Active'
                      ? 'bg-risk-low-fill dark:bg-risk-low-fill shadow-sm'
                      : 'bg-text-muted'
                  }`}
                />
                {activeP.program_status || 'Active Docket'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-2 tracking-tight font-display">
              {activeP.first_name} {activeP.last_name}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {activeP.gender || 'Not specified'} · {activeP.age ? `${activeP.age} years old` : 'Age unknown'} ·{' '}
              {activeP.race || 'Race not recorded'} · Primary Substance:{' '}
              <strong className="text-text-primary">{activeP.primary_substance || 'Polysubstance'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to={`/participants/${activeP.id}/edit`}
              className="min-h-[44px] px-4 py-2 border border-border-ui/40 dark:border-border-ui/40 glass-pill hover:bg-bg-raised rounded-full inline-flex gap-2 items-center text-xs font-bold transition-all text-text-primary cursor-pointer"
            >
              <Pencil size={15} /> Edit Demographics
            </Link>
            <Link
              to={`/assessments/new?participant=${activeP.id}`}
              className="min-h-[44px] px-5 py-2 bg-accent-primary hover:bg-accent-hover text-accent-primary-text rounded-full inline-flex gap-2 items-center text-xs font-bold transition-all shadow-xs hover:scale-[1.01] cursor-pointer"
            >
              <Plus size={15} /> Run Assessment
            </Link>
          </div>
        </div>

        {/* Dynamic Supervision Indicators Grid */}
        <div className="mt-6 pt-6 border-t border-border-ui/20 dark:border-border-ui/40 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-border-ui/30 dark:border-border-ui/40 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span>Program Attendance</span>
              <Calendar size={15} className="text-accent-text" />
            </div>
            <p className="text-2xl font-black text-text-primary mt-2 font-display tabular-nums">
              {activeP.program_attendances ?? 0}{' '}
              <span className="text-xs font-normal text-text-muted">sessions</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">Supervised meetings</p>
          </div>
          
          <div className="glass-card rounded-2xl p-4 border border-border-ui/30 dark:border-border-ui/40 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span>Unexcused Absences</span>
              <AlertTriangle size={15} className="text-risk-med-text" />
            </div>
            <p className="text-2xl font-black text-text-primary mt-2 font-display tabular-nums">
              {activeP.program_unexcused_absences ?? 0}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">Missed court / clinic</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-border-ui/30 dark:border-border-ui/40 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span>Employment Days</span>
              <Briefcase size={15} className="text-accent-text" />
            </div>
            <p className="text-2xl font-black text-text-primary mt-2 font-display tabular-nums">
              {activeP.percent_days_employed != null
                ? `${(activeP.percent_days_employed * (activeP.percent_days_employed <= 1 ? 100 : 1)).toFixed(0)}%`
                : '0%'}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">Verified active days</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-border-ui/30 dark:border-border-ui/40 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span>Positive Drug Screens</span>
              <ShieldAlert size={15} className="text-risk-high-text" />
            </div>
            <p className="text-2xl font-black text-text-primary mt-2 font-display tabular-nums">
              {activeP.drug_tests_positive_count ?? 0}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">Toxicology failures</p>
          </div>
        </div>

        {/* Static Demographics & Risk Factors */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          <div className="p-3 bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 rounded-xl">
            <span className="text-text-muted block font-medium">Employment</span>
            <span className="font-bold text-text-primary mt-0.5 block">{activeP.employment_status || '—'}</span>
          </div>
          <div className="p-3 bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 rounded-xl">
            <span className="text-text-muted block font-medium">Prior Arrests</span>
            <span className="font-bold text-text-primary mt-0.5 block font-mono">{activeP.prior_arrests ?? 0}</span>
          </div>
          <div className="p-3 bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 rounded-xl">
            <span className="text-text-muted block font-medium">Prior Felonies</span>
            <span className="font-bold text-text-primary mt-0.5 block font-mono">{activeP.prior_felonies ?? 0}</span>
          </div>
          <div className="p-3 bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 rounded-xl">
            <span className="text-text-muted block font-medium">Age 1st Arrest</span>
            <span className="font-bold text-text-primary mt-0.5 block font-mono">{activeP.age_first_arrest || '—'}</span>
          </div>
          <div className="p-3 bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 rounded-xl">
            <span className="text-text-muted block font-medium">Trauma Score</span>
            <span className="font-bold text-text-primary mt-0.5 block font-mono">{activeP.trauma_score ?? 0.0}</span>
          </div>
          <div className="p-3 bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 rounded-xl">
            <span className="text-text-muted block font-medium">ACE Score</span>
            <span className="font-bold text-text-primary mt-0.5 block font-mono">{activeP.ace_score ?? 0} / 10</span>
          </div>
        </div>
      </div>

      {/* Longitudinal Risk Trajectory Graph */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-ui/20 dark:border-border-ui/40">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="text-accent-text" size={20} />
              <h2 className="text-lg font-bold text-text-primary tracking-tight font-display">
                Longitudinal Recidivism Risk Trajectory
              </h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Visualizes risk progression from Intake Baseline (t₀) through ongoing Dynamic Checkpoints (t₁, t₂...).
            </p>
          </div>

          <div>
            <TrajectoryBadge flag={trajectoryStatus} delta={deltaRisk / 100} />
          </div>
        </div>

        {/* Recharts Trajectory Graph */}
        <div className="mt-6">
          {trajectories.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectories} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-ui)" opacity={0.2} />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickFormatter={(val) => `${val}%`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-surface)',
                      borderColor: 'var(--color-border-ui)',
                      borderRadius: '12px',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                      boxShadow: '0 8px 30px var(--chart-tooltip-shadow)',
                    }}
                    formatter={(value) => [`${value}%`, 'Recidivism Risk']}
                    labelFormatter={(label) => `Checkpoint: ${label}`}
                  />
                  <ReferenceLine
                    y={65}
                    stroke="var(--risk-high-fill)"
                    strokeDasharray="3 3"
                    label={{ value: 'High Risk (65%)', fill: 'var(--risk-high-fill)', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={35}
                    stroke="var(--risk-low-fill)"
                    strokeDasharray="3 3"
                    label={{ value: 'Low Risk (35%)', fill: 'var(--risk-low-fill)', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="risk_probability"
                    stroke="var(--color-accent-text)"
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'var(--color-accent-text)', stroke: 'var(--color-bg-base)', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10 bg-bg-base/40 rounded-2xl text-text-muted text-xs border border-border-ui/30">
              No longitudinal evaluation points recorded yet.
            </div>
          )}
        </div>

        {/* What-If CTA Bar */}
        {latestAssessment && (
          <div className="mt-6 p-5 rounded-2xl glass-card border border-border-ui/40 dark:border-border-ui/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-primary text-accent-primary-text flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                  Interactive What-If Simulation Studio
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Simulate counterfactual supervision changes (attendance, drug testing, employment) to evaluate quantitative risk reduction.
                </p>
              </div>
            </div>
            <Link
              to={`/assessments/${latestAssessment.id}`}
              className="min-h-[44px] px-5 py-2 bg-accent-primary hover:bg-accent-hover text-accent-primary-text rounded-full text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-center transition-all shrink-0 shadow-xs hover:scale-[1.01] cursor-pointer"
            >
              Open Simulator Studio <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Two-Column Section: Assessment History & Intervention Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assessment History */}
        <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-ui/20 dark:border-border-ui/40 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-text-primary text-sm font-display">Assessment History</h2>
              <p className="text-xs text-text-muted">Historical intake & dynamic evaluations</p>
            </div>
            <Link
              to={`/assessments/new?participant=${activeP.id}`}
              className="text-xs min-h-[44px] px-4 py-2 rounded-full bg-bg-raised text-accent-text font-bold hover:bg-border-ui/20 transition-colors border border-border-ui/30 inline-flex items-center"
            >
              + New Assessment
            </Link>
          </div>

          <div className="divide-y divide-border-ui/20 dark:divide-border-ui/30 flex-1">
            {assessments.length ? (
              assessments.map((a, idx) => (
                <Link
                  key={a.id}
                  to={`/assessments/${a.id}`}
                  className="block p-4 hover:bg-bg-raised/40 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-text-primary text-xs">
                          Assessment #{a.id}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-raised border border-border-ui/30 text-text-muted font-mono">
                          {a.assessment_stage || (idx === 0 ? 'INTAKE' : 'DYNAMIC')}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1">
                        {new Date(a.assessment_date).toLocaleDateString()} at{' '}
                        {new Date(a.assessment_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <RiskLevelBadge
                        level={a.risk_level}
                        probability={a.recidivism_probability}
                        size="sm"
                      />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-text-muted text-xs">No assessments recorded.</div>
            )}
          </div>
        </div>

        {/* Intervention Plans */}
        <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-ui/20 dark:border-border-ui/40 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-text-primary text-sm font-display">Active Court Interventions</h2>
              <p className="text-xs text-text-muted">Court orders & treatment protocols</p>
            </div>
            <Link
              to={`/interventions?participant=${activeP.id}`}
              className="text-xs min-h-[44px] px-4 py-2 rounded-full bg-bg-raised text-accent-text font-bold hover:bg-border-ui/20 transition-colors border border-border-ui/30 inline-flex items-center"
            >
              + Create Order
            </Link>
          </div>

          <div className="divide-y divide-border-ui/20 dark:divide-border-ui/30 flex-1">
            {plans.length ? (
              plans.map((x) => (
                <div key={x.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-text-primary text-xs">{x.title}</p>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-bg-raised text-accent-text border border-border-ui/30 font-mono">
                      {x.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {x.description || 'No description recorded'}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-text-muted text-xs">No intervention orders active.</div>
            )}
          </div>
        </div>
      </div>

      {/* Case Notes Section */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl shadow-xs p-6 sm:p-8">
        <div className="flex items-center gap-2 pb-4 border-b border-border-ui/20 dark:border-border-ui/40">
          <MessageSquare size={18} className="text-accent-text" />
          <h2 className="font-bold text-text-primary text-sm font-display">Clinical & Judicial Case Notes</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Record clinical progress, toxicology screen results, or judicial status remark..."
            className="flex-1 min-h-[44px] border border-border-ui/40 dark:border-border-ui/40 bg-bg-base/80 dark:bg-bg-raised/50 rounded-full px-4 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
          />
          <button
            onClick={addNote}
            className="min-h-[44px] px-6 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold transition-all text-xs shadow-xs cursor-pointer self-stretch sm:self-center"
          >
            Add Note
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="p-3.5 rounded-2xl bg-bg-base/40 border border-border-ui/30 dark:border-border-ui/40 text-xs">
              <p className="text-text-primary leading-relaxed font-medium">{n.content}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-ui/20 dark:border-border-ui/40 text-[10px] text-text-muted">
                <span>Staff Supervisory Author</span>
                <span className="font-mono">{new Date(n.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
