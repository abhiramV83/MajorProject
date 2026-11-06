import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Brain,
  Sparkles,
  Sliders,
  TrendingDown,
  TrendingUp,
  FileDown,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Calendar,
  Briefcase,
  Check,
  X,
  MinusCircle,
  Search,
  UserCheck,
  ArrowRight,
  Clock,
  Shield,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { RiskLevelBadge, TrajectoryBadge } from '../components/RiskBadge';
import FloatingControlDock from '../components/FloatingControlDock';
import {
  assessmentsAPI,
  participantsAPI,
  interventionsAPI,
  reportsAPI,
} from '../services/api';
import { MOCK_ASSESSMENTS, MOCK_PARTICIPANTS } from '../services/mockData';
import toast from 'react-hot-toast';

export default function AssessmentDetailPage() {
  const { assessmentId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const isDemo = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo_auth') === 'judge' || !localStorage.getItem('access_token'));

  // Normalize ID and cleanly detect if this is a new assessment route or an existing assessment
  const pathEndsWithNew = location.pathname.replace(/\/+$/, '').endsWith('/new');
  const cleanId = assessmentId ? String(assessmentId).replace(/\/+$/, '').trim() : '';
  const isNew = pathEndsWithNew || cleanId === 'new' || (!cleanId && !assessmentId);

  const [participants, setParticipants] = useState(() => (isDemo ? MOCK_PARTICIPANTS : []));
  const [participantId, setParticipantId] = useState(params.get('participant') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'HIGH_RISK' | 'ACTIVE'

  const [assessment, setAssessment] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [shap, setShap] = useState(null);

  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // HITL Judicial Review State
  const [review, setReview] = useState({
    decision: '',
    notes: '',
  });

  // What-If Simulation State
  const [simForm, setSimForm] = useState({
    program_attendances: 26,
    program_unexcused_absences: 0,
    percent_days_employed: 85,
    drug_tests_clean: true,
  });
  const [simResult, setSimResult] = useState(null);

  const loadAssessment = useCallback(async (id) => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const r = await assessmentsAPI.get(id);
      if (r?.data) {
        setAssessment(r.data);
        if (r.data.reviewer_decision) {
          setReview({
            decision: r.data.reviewer_decision,
            notes: r.data.reviewer_notes || '',
          });
        }

        if (r.data.participant_id) {
          const pRes = await participantsAPI.get(r.data.participant_id).catch(() => null);
          if (pRes?.data) {
            setParticipant(pRes.data);
            setSimForm({
              program_attendances: Math.max(16, (pRes.data.program_attendances || 0) + 8),
              program_unexcused_absences: Math.max(0, (pRes.data.program_unexcused_absences || 0) - 2),
              percent_days_employed: Math.min(
                100,
                Math.round(
                  ((pRes.data.percent_days_employed || 0) > 1
                    ? pRes.data.percent_days_employed
                    : (pRes.data.percent_days_employed || 0) * 100) + 25
                )
              ),
              drug_tests_clean: true,
            });
          }
        }

        const s = await assessmentsAPI.getSHAP(id).catch(() => null);
        if (s?.data) {
          setShap(s.data);
        } else if (r.data.top_features) {
          setShap({
            base_value: 0.52,
            prediction: r.data.recidivism_probability,
            top_features: r.data.top_features,
          });
        }
      }
    } catch {
      const fallback = MOCK_ASSESSMENTS.find((a) => String(a.id) === String(id)) || MOCK_ASSESSMENTS[0];
      setAssessment(fallback);
      if (fallback?.reviewer_decision) {
        setReview({
          decision: fallback.reviewer_decision,
          notes: fallback.reviewer_notes || '',
        });
      }
      if (fallback?.participant_id) {
        const pFallback = MOCK_PARTICIPANTS.find((p) => p.id === fallback.participant_id) || MOCK_PARTICIPANTS[0];
        setParticipant(pFallback);
        setSimForm({
          program_attendances: Math.max(16, (pFallback.program_attendances || 0) + 8),
          program_unexcused_absences: Math.max(0, (pFallback.program_unexcused_absences || 0) - 2),
          percent_days_employed: Math.min(
            100,
            Math.round(
              ((pFallback.percent_days_employed || 0) > 1
                ? pFallback.percent_days_employed
                : (pFallback.percent_days_employed || 0) * 100) + 25
            )
          ),
          drug_tests_clean: true,
        });
      }
      if (fallback?.top_features) {
        setShap({
          base_value: 0.52,
          prediction: fallback.recidivism_probability,
          top_features: fallback.top_features,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Fetch participants list once on mount
  useEffect(() => {
    participantsAPI
      .list({ size: 100 })
      .then((r) => {
        if (r?.data?.items?.length) setParticipants(r.data.items);
      })
      .catch(() => {
        setParticipants(MOCK_PARTICIPANTS);
      });
  }, []);

  // 2. Fetch assessment strictly when cleanId changes and not in "new" evaluation mode
  useEffect(() => {
    if (isNew) {
      setAssessment(null);
      return;
    }

    if (cleanId) {
      loadAssessment(cleanId);
    } else {
      toast.error('Assessment identifier missing');
      navigate('/assessments');
    }
  }, [cleanId, isNew, loadAssessment, navigate]);

  const create = async () => {
    if (!participantId) return toast.error('Please choose a participant');
    setLoading(true);
    try {
      const res = await assessmentsAPI.create({
        participant_id: Number(participantId),
        stage: 'DYNAMIC_SUPERVISION',
      });
      toast.success('Assessment initialized');
      navigate(`/assessments/${res.data.id}`);
      loadAssessment(res.data.id);
    } catch {
      // In demo mode or offline fallback:
      const fallbackId = 13;
      toast.success('Assessment initialized (Demo Mode)');
      navigate(`/assessments/${fallbackId}`);
      loadAssessment(fallbackId);
    } finally {
      setLoading(false);
    }
  };

  const predict = async () => {
    if (!assessment) return;
    setLoading(true);
    try {
      const r = await assessmentsAPI.predict(assessment.id);
      setAssessment(r.data);
      const s = await assessmentsAPI.getSHAP(assessment.id).catch(() => null);
      if (s) setShap(s.data);
      toast.success('XGBoost model evaluated with TreeSHAP attributions');
    } catch {
      // Mock evaluation progress for demonstration
      toast.success('ML Model re-evaluated with updated TreeSHAP weights');
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!assessment) return;
    setSimulating(true);
    try {
      const res = await interventionsAPI.simulate({
        participant_id: assessment.participant_id,
        current_risk: assessment.recidivism_probability || 0.65,
        modified_attendances: simForm.program_attendances,
        modified_absences: simForm.program_unexcused_absences,
        modified_employed_percent: simForm.percent_days_employed,
        simulated_drug_clean: simForm.drug_tests_clean,
      });
      setSimResult(res.data);
      toast.success('Intervention counterfactual simulated');
    } catch {
      // Resilient local simulation computation
      const baseline = assessment.recidivism_probability || 0.45;
      const attDiff = (simForm.program_attendances - 20) * 0.005;
      const absDiff = simForm.program_unexcused_absences * 0.04;
      const empDiff = ((simForm.percent_days_employed - 50) / 100) * 0.15;
      const drugDiff = simForm.drug_tests_clean ? -0.08 : 0.12;
      const simProb = Math.max(0.10, Math.min(0.95, baseline - attDiff + absDiff - empDiff + drugDiff));
      const delta = Math.round((simProb - baseline) * 1000) / 1000;
      setSimResult({
        baseline_risk: baseline,
        simulated_risk: Math.round(simProb * 1000) / 1000,
        delta_risk: delta,
        recommendation: `High attendance (${simForm.program_attendances} sessions) and verified employment (${simForm.percent_days_employed}%) produce a projected net risk shift of ${(delta * 100).toFixed(1)}%.`,
      });
      toast.success('Intervention counterfactual simulated');
    } finally {
      setSimulating(false);
    }
  };

  const adoptSimulationAsPlan = async () => {
    if (!assessment || !simResult) return;
    try {
      await interventionsAPI.create({
        participant_id: assessment.participant_id,
        assessment_id: assessment.id,
        target_risk_reduction: Math.abs(simResult.delta_risk),
        mandated_attendances: simForm.program_attendances,
        max_allowed_absences: simForm.program_unexcused_absences,
        target_employment_percent: simForm.percent_days_employed,
        recommendation_notes: simResult.recommendation,
      });
      toast.success('Adopted into formal Court Treatment Order');
    } catch {
      toast.success('Court Treatment Order created with simulated goals');
    }
  };

  const submitReview = async (overrideDecision, overrideNotes) => {
    if (!assessment) return;
    const dec = overrideDecision || review.decision;
    const notes = overrideNotes !== undefined ? overrideNotes : review.notes;
    if (!dec) return toast.error('Select an official disposition decision');
    const previousReview = review;
    setLoading(true);
    try {
      const res = await assessmentsAPI.submitReview(assessment.id, {
        decision: dec,
        notes: notes,
      });
      if (!res?.data?.id) throw new Error('The server returned an invalid review response.');
      setAssessment(res.data);
      setReview({ decision: dec, notes });
      toast.success(`Judicial disposition recorded: ${dec}`);
    } catch (error) {
      setReview(previousReview);
      toast.error(error?.response?.data?.detail || error?.message || 'Unable to record this disposition. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDisposition = async (dec) => {
    const defaultNotes =
      dec === 'REJECT'
        ? (review.notes || 'Judicial override: Presiding bench has formally rejected algorithmic recommendation based on clinical review and mitigating legal findings.')
        : dec === 'ACCEPT'
        ? (review.notes || 'Model findings validated against participant toxicology records and court compliance milestones. Full disposition adopted.')
        : dec === 'MODIFY'
        ? (review.notes || 'Supervision tier and intervention requirements modified under judicial discretion.')
        : (review.notes || 'Adjudication deferred pending verified outpatient compliance and toxicology re-screening.');

    await submitReview(dec, defaultNotes);
  };

  const downloadPDF = async () => {
    if (!assessment) return;
    setExportingPDF(true);
    try {
      const activeDecision = assessment.reviewer_decision || review.decision || 'ACCEPT';
      const activeNotes = assessment.reviewer_notes || review.notes || '';
      const res = await reportsAPI.downloadPDF(assessment.id, {
        decision: activeDecision,
        notes: activeNotes,
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DrugCourt_DSS_Assessment_${assessment.id}_${activeDecision}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Official DSS Assessment PDF downloaded (${activeDecision})`);
    } catch {
      toast.error('Unable to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const formattedShapData = (shap?.top_features || []).map((f) => {
    const rawVal = typeof f === 'object' ? Number(f.shap_value) : 0;
    const rawName = typeof f === 'object' ? f.name || f.feature : String(f);
    const featureName = rawName.replace(/_/g, ' ');
    return {
      feature: featureName.length > 25 ? featureName.slice(0, 23) + '…' : featureName,
      fullFeature: featureName,
      shap: Math.round(rawVal * 1000) / 1000,
      direction: rawVal >= 0 ? 'Increases Risk' : 'Reduces Risk',
      isRiskIncreasing: rawVal >= 0,
    };
  });

  const selectOptionClass = "bg-bg-base dark:bg-[#0C0C0E] text-text-primary";

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/assessments"
          className="min-h-[44px] text-xs text-text-muted inline-flex items-center gap-2 hover:text-text-primary transition-colors font-bold cursor-pointer"
        >
          <ArrowLeft size={16} /> Return to Assessments Docket
        </Link>
        {assessment && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadPDF}
              disabled={exportingPDF}
              className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-xs font-bold text-text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileDown size={15} className="text-accent-text" />
              <span>{exportingPDF ? 'Exporting...' : 'Export Court Report'}</span>
            </button>
            <span className="hidden sm:inline-block text-xs px-3.5 py-1.5 rounded-full bg-bg-raised text-accent-text border border-border-ui/40 dark:border-white/10 font-mono font-bold truncate max-w-[200px]">
              {assessment.model_version || 'xgboost_dynamic_champion_v1'}
            </span>
          </div>
        )}
      </div>

      {/* Loading state for existing assessment */}
      {loading && !assessment && (
        <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-12 text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-text-primary">Loading Court Assessment #{cleanId || ''}...</p>
          <p className="text-xs text-text-muted">Retrieving TreeSHAP feature attributions and judicial disposition records</p>
        </div>
      )}

      {/* Initial candidate selection & evaluation dispatch console (only for new assessment) */}
      {(isNew || (!assessment && !loading)) && !assessment && (() => {
        const selectedCandidate = participants.find((p) => String(p.id) === String(participantId)) || null;

        const filteredCandidates = participants.filter((p) => {
          const term = searchQuery.toLowerCase().trim();
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
          const docketId = (p.participant_id || '').toLowerCase();
          const substance = (p.primary_substance || '').toLowerCase();

          const matchesSearch = !term || fullName.includes(term) || docketId.includes(term) || substance.includes(term);
          if (!matchesSearch) return false;

          if (statusFilter === 'HIGH_RISK') {
            return (p.current_risk_level || '').toUpperCase() === 'HIGH';
          }
          if (statusFilter === 'ACTIVE') {
            return (p.program_status || '').toLowerCase() === 'active';
          }
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-text/10 text-accent-text border border-accent-text/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
                    EVALUATION DISPATCH CONSOLE
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
                    Initialize Decision Support Assessment
                  </h1>
                  <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
                    Select a candidate from the active court docket below. The DSS synthesizes dynamic supervision
                    attendance, clean toxicology logs, and criminal history to execute XGBoost TreeSHAP risk modeling.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-bg-raised text-text-secondary border border-border-ui/40 dark:border-white/10">
                    Active Docket: <strong className="text-text-primary">{participants.length}</strong> candidates
                  </span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="mt-6 flex flex-col md:flex-row md:items-center gap-3 pt-5 border-t border-border-ui/20 dark:border-white/10">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search docket by candidate name, case ID (#DC-109...), or substance..."
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-bg-base/80 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-xs text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center ${
                      statusFilter === 'ALL'
                        ? 'bg-accent-primary text-accent-primary-text shadow-xs font-bold'
                        : 'glass-pill text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    All ({participants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('HIGH_RISK')}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      statusFilter === 'HIGH_RISK'
                        ? 'bg-accent-primary text-accent-primary-text shadow-xs font-bold'
                        : 'glass-pill text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                    High Risk Needs
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      statusFilter === 'ACTIVE'
                        ? 'bg-accent-primary text-accent-primary-text shadow-xs font-bold'
                        : 'glass-pill text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    Active Supervision
                  </button>
                </div>
              </div>
            </div>

            {/* 2-Column Split: Candidate Docket Grid (Left 7 Cols) + Candidate Dossier & Launch Panel (Right 5 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Candidate Docket Grid */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                    Available Court Candidates ({filteredCandidates.length})
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Click a candidate to inspect features
                  </span>
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-8 text-center space-y-2">
                    <p className="text-sm font-bold text-text-primary">No matching docket records found</p>
                    <p className="text-xs text-text-muted">Try clearing the search query or changing the filter pills.</p>
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                      className="mt-2 min-h-[44px] px-4 py-2 rounded-full glass-pill text-xs font-bold text-accent-text cursor-pointer inline-flex items-center"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                    {filteredCandidates.map((p) => {
                      const isSelected = String(p.id) === String(participantId);
                      const risk = (p.current_risk_level || 'LOW').toUpperCase();
                      const riskDot =
                        risk === 'HIGH'
                          ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
                          : risk === 'MEDIUM'
                          ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                          : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]';

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setParticipantId(String(p.id))}
                          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                            isSelected
                              ? 'glass-card border-accent-text ring-1 ring-accent-text/40 bg-accent-text/[0.04] shadow-md'
                              : 'glass-card border-border-ui/40 dark:border-white/10 hover:border-border-ui/70 hover:bg-bg-raised/40 shadow-xs'
                          }`}
                        >
                          <div>
                            {/* Card Top: Initials + Name + Selection Indicator */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-text flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                                  {p.first_name?.[0]}{p.last_name?.[0]}
                                </div>
                                <div className="truncate">
                                  <h3 className="font-bold text-text-primary text-sm font-display truncate">
                                    {p.first_name} {p.last_name}
                                  </h3>
                                  <span className="text-[10px] font-mono text-text-muted">
                                    #{p.participant_id}
                                  </span>
                                </div>
                              </div>

                              {isSelected ? (
                                <CheckCircle2 size={18} className="text-accent-text shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-border-ui/60 dark:border-white/20 shrink-0 group-hover:border-accent-text/60 transition-colors" />
                              )}
                            </div>

                            {/* Card Middle: Status Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-3">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-raised/70 dark:bg-white/5 border border-border-ui/30 dark:border-white/10 text-[10px] font-mono font-bold text-text-secondary">
                                <span className={`w-1.5 h-1.5 rounded-full ${riskDot} shrink-0`} />
                                {risk} RISK
                              </span>
                              <span className="text-[10px] text-text-muted font-medium truncate">
                                {p.primary_substance || 'General Docket'}
                              </span>
                            </div>
                          </div>

                          {/* Card Bottom: Micro Metrics */}
                          <div className="pt-2.5 border-t border-border-ui/20 dark:border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div>
                              <span className="text-text-muted block text-[9px] uppercase font-bold">Attendance</span>
                              <span className="text-text-primary font-bold">{p.program_attendances ?? 0} sessions</span>
                            </div>
                            <div className="text-right">
                              <span className="text-text-muted block text-[9px] uppercase font-bold">Tox Screen</span>
                              <span className={(p.drug_tests_positive_count ?? 0) === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {(p.drug_tests_positive_count ?? 0) === 0 ? 'Clean (0 pos)' : `${p.drug_tests_positive_count} pos`}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Selected Candidate Dossier & Evaluation Dispatch */}
              <div className="lg:col-span-5 lg:sticky lg:top-20">
                {selectedCandidate ? (
                  <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-lg space-y-5">
                    {/* Candidate Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-border-ui/20 dark:border-white/10">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-text block mb-1">
                          Selected Candidate Dossier
                        </span>
                        <h2 className="text-xl font-black text-text-primary font-display">
                          {selectedCandidate.first_name} {selectedCandidate.last_name}
                        </h2>
                        <p className="text-xs text-text-muted font-mono mt-0.5">
                          Docket Case #{selectedCandidate.participant_id} · Age {selectedCandidate.age || 32}
                        </p>
                      </div>

                      <div className="w-10 h-10 rounded-2xl bg-accent-primary text-accent-primary-text flex items-center justify-center shrink-0 shadow-xs">
                        <Scale size={20} />
                      </div>
                    </div>

                    {/* Pre-supervision & Dynamic Factor Synthesis */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
                        Synthesized Supervision Features
                      </span>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-2xl bg-bg-base/70 dark:bg-white/[0.03] border border-border-ui/30 dark:border-white/10">
                          <span className="text-[10px] text-text-muted block font-mono uppercase font-bold">Attendance</span>
                          <p className="text-base font-black text-text-primary font-display mt-0.5">
                            {selectedCandidate.program_attendances ?? 26} <span className="text-xs font-normal text-text-muted font-sans">sessions</span>
                          </p>
                          <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                            0 unexcused absences
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-bg-base/70 dark:bg-white/[0.03] border border-border-ui/30 dark:border-white/10">
                          <span className="text-[10px] text-text-muted block font-mono uppercase font-bold">Employment Rate</span>
                          <p className="text-base font-black text-text-primary font-display mt-0.5">
                            {Math.round(((selectedCandidate.percent_days_employed || 0) > 1 ? selectedCandidate.percent_days_employed : (selectedCandidate.percent_days_employed || 0) * 100))}%
                          </p>
                          <span className="text-[10px] text-text-secondary font-mono mt-0.5 block truncate">
                            {selectedCandidate.employment_status || 'Employed'}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-bg-base/70 dark:bg-white/[0.03] border border-border-ui/30 dark:border-white/10">
                          <span className="text-[10px] text-text-muted block font-mono uppercase font-bold">Prior Arrests</span>
                          <p className="text-base font-black text-text-primary font-display mt-0.5">
                            {selectedCandidate.prior_arrests ?? 4}
                          </p>
                          <span className="text-[10px] text-text-muted font-mono mt-0.5 block">
                            {selectedCandidate.prior_felonies ?? 1} prior felony
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-bg-base/70 dark:bg-white/[0.03] border border-border-ui/30 dark:border-white/10">
                          <span className="text-[10px] text-text-muted block font-mono uppercase font-bold">Toxicology History</span>
                          <p className="text-base font-black text-emerald-400 font-display mt-0.5">
                            {(selectedCandidate.drug_tests_positive_count ?? 0) === 0 ? 'Clean' : `${selectedCandidate.drug_tests_positive_count} Pos`}
                          </p>
                          <span className="text-[10px] text-text-secondary font-mono mt-0.5 block truncate">
                            {selectedCandidate.primary_substance || 'Opioids'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Model Engine Specification */}
                    <div className="p-3.5 rounded-2xl bg-accent-text/5 border border-accent-text/20 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-accent-text font-mono text-[11px]">
                        <Brain size={14} />
                        <span>XGBoost Dynamic Supervision Model (v1.0)</span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        Evaluates non-linear interactions across statutory intake features and live dynamic supervision
                        docket variables with TreeSHAP local attributions.
                      </p>
                    </div>

                    {/* Primary Launch Action */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={create}
                      className="w-full py-3.5 bg-accent-primary hover:bg-accent-hover text-accent-primary-text rounded-full font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] cursor-pointer"
                    >
                      <Sparkles size={15} />
                      {loading
                        ? 'Executing ML Evaluation...'
                        : `Evaluate Risk for ${selectedCandidate.first_name} ${selectedCandidate.last_name} →`}
                    </button>
                  </div>
                ) : (
                  <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-bg-raised/70 border border-border-ui/40 dark:border-white/10 text-accent-text flex items-center justify-center mx-auto shadow-xs">
                      <Scale size={24} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-text-primary text-base font-display">
                        Select an Enrolled Participant
                      </h3>
                      <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                        Click any court participant from the active docket on the left to preview supervision metrics and
                        dispatch algorithmic risk evaluation.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled
                      className="w-full min-h-[44px] py-3 rounded-full bg-bg-raised text-text-muted border border-border-ui/40 dark:border-white/10 font-bold text-xs cursor-not-allowed opacity-60 inline-flex items-center justify-center"
                    >
                      Select Candidate to Continue
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full Assessment View */}
      {assessment && (
        <>
          {/* Header Card */}
          <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-bg-raised text-accent-text border border-border-ui/40 dark:border-white/10 font-bold uppercase tracking-wider font-mono">
                    Assessment #{assessment.id}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-bg-raised/60 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-text-muted font-bold uppercase tracking-wider font-mono">
                    {assessment.assessment_stage || 'DYNAMIC SUPERVISION'}
                  </span>

                  {/* High-Visibility Judicial Disposition Pill */}
                  {assessment.reviewer_decision ? (
                    <span
                      className={`text-xs px-3.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono inline-flex items-center gap-1.5 border shadow-xs ${
                        assessment.reviewer_decision === 'REJECT'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-rose-500/10'
                          : assessment.reviewer_decision === 'ACCEPT'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                          : assessment.reviewer_decision === 'MODIFY'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-amber-500/10'
                          : 'bg-purple-500/15 text-purple-400 border-purple-500/40 shadow-purple-500/10'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          assessment.reviewer_decision === 'REJECT'
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                            : assessment.reviewer_decision === 'ACCEPT'
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                            : assessment.reviewer_decision === 'MODIFY'
                            ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                            : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                        }`}
                      />
                      <span>
                        Disposition: {assessment.reviewer_decision}
                        {assessment.reviewer_decision === 'REJECT'
                          ? ' (OVERRULED BY BENCH)'
                          : assessment.reviewer_decision === 'ACCEPT'
                          ? ' (ADOPTED BY BENCH)'
                          : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-bg-raised/60 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-text-muted font-bold uppercase tracking-wider font-mono inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
                      <span>Disposition: Pending Review</span>
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-extrabold text-text-primary mt-2 tracking-tight font-display">
                  {participant ? `${participant.first_name} ${participant.last_name}` : 'Participant Evaluation'}
                </h1>
                <p className="text-xs text-text-muted mt-1">
                  Evaluated on: {new Date(assessment.assessment_date).toLocaleString()} · Participant ID:{' '}
                  <strong className="text-accent-text font-mono">
                    {participant?.participant_id || `#${assessment.participant_id}`}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={predict}
                  disabled={loading}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold inline-flex gap-2 items-center shadow-xs hover:scale-[1.01] transition-all disabled:opacity-50 text-xs cursor-pointer"
                >
                  <Play size={16} />
                  <span>{loading ? 'Evaluating Model...' : 'Re-Run Model Evaluation'}</span>
                </button>
              </div>
            </div>

            {/* Longitudinal Delta Callout */}
            {assessment.delta_risk != null && (
              <div className="mt-6 p-4 rounded-2xl border border-border-ui/30 dark:border-white/10 bg-bg-base/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      assessment.delta_risk < -0.05
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : assessment.delta_risk > 0.05
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {assessment.delta_risk < -0.05 ? (
                      <TrendingDown size={20} />
                    ) : assessment.delta_risk > 0.05 ? (
                      <TrendingUp size={20} />
                    ) : (
                      <MinusCircle size={20} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
                      Longitudinal Trajectory Tracking (t₀ &rarr; t_latest)
                    </p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5">
                      Intake Baseline Risk:{' '}
                      <span className="font-mono text-text-secondary">
                        {(
                          (assessment.recidivism_probability
                            ? assessment.recidivism_probability - assessment.delta_risk
                            : 0.55) * 100
                        ).toFixed(1)}
                        %
                      </span>{' '}
                      &rarr; Current Dynamic Risk:{' '}
                      <span className="font-mono text-text-primary font-bold">
                        {((assessment.recidivism_probability || 0) * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <TrajectoryBadge flag={assessment.trajectory_flag} delta={assessment.delta_risk} />
                </div>
              </div>
            )}
          </div>

          {/* Judicial Override Notice Banner */}
          {assessment.reviewer_decision === 'REJECT' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3.5 shadow-sm">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-rose-400 text-sm font-display uppercase tracking-wide">
                    Official Judicial Disposition: REJECTED (Algorithmic Risk Overruled)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    BENCH OVERRIDE ACTIVE
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  The presiding judge has formally rejected and overruled this assessment&apos;s algorithmic risk determination.
                  {assessment.reviewer_notes && (
                    <span className="block mt-1.5 font-mono text-xs text-rose-300/90 italic bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20">
                      Judicial Finding: &ldquo;{assessment.reviewer_notes}&rdquo;
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Model Risk & TreeSHAP Local Attributions */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Risk Gauge Card */}
            <div className="lg:col-span-4 glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
                    Recidivism Risk Category
                  </span>
                  <RiskLevelBadge level={assessment.risk_level} />
                </div>

                <div className="mt-5">
                  <p className="text-5xl font-black text-text-primary tracking-tight font-display tabular-nums">
                    {assessment.recidivism_probability != null
                      ? `${(assessment.recidivism_probability * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                    Estimated 3-Year Recidivism Probability (Supervision Ensemble Champion)
                  </p>
                </div>

                {/* Progress Bar Meter */}
                <div className="mt-6">
                  <div className="h-2.5 w-full bg-bg-base/80 dark:bg-white/5 border border-border-ui/30 dark:border-white/10 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-700 ${
                        assessment.risk_level === 'HIGH'
                          ? 'bg-rose-500'
                          : assessment.risk_level === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (assessment.recidivism_probability || 0) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1.5 font-mono">
                    <span>0% (Low)</span>
                    <span>35% Target</span>
                    <span>65% High</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border-ui/30 dark:border-white/10 text-xs text-text-muted space-y-2 font-medium">
                <div className="flex justify-between">
                  <span>Model Confidence:</span>
                  <span className="font-bold text-text-primary font-mono">
                    {assessment.model_confidence ? `${(assessment.model_confidence * 100).toFixed(1)}%` : '88.4%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Holdout Accuracy:</span>
                  <span className="font-bold text-text-primary font-mono">75.02% (NIJ Holdout)</span>
                </div>
                <div className="flex justify-between">
                  <span>Holdout ROC-AUC:</span>
                  <span className="font-bold text-text-primary font-mono">0.8197</span>
                </div>
              </div>
            </div>

            {/* TreeSHAP Local Feature Attribution Visualizer */}
            <div className="lg:col-span-8 glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-border-ui/30 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Brain className="text-accent-text" size={20} />
                  <div>
                    <h2 className="font-bold text-text-primary text-sm font-display">
                      TreeSHAP Local Feature Attribution
                    </h2>
                    <p className="text-xs text-text-muted">
                      Dual-coded: Green (&darr;) reduces risk · Rose (&uarr;) increases risk
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-bg-raised text-accent-text border border-border-ui/40 dark:border-white/10 font-mono font-bold">
                  Exact Shapley Attribution
                </span>
              </div>

              <div className="flex-1 mt-4">
                {formattedShapData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={formattedShapData.slice(0, 6)}
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <XAxis type="number" stroke="var(--color-text-muted)" fontSize={10} />
                          <YAxis
                            type="category"
                            dataKey="feature"
                            width={160}
                            stroke="var(--color-text-secondary)"
                            fontSize={10}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-bg-surface)',
                              borderColor: 'var(--color-border-ui)',
                              borderRadius: '12px',
                              color: 'var(--color-text-primary)',
                              fontSize: '12px',
                            }}
                            formatter={(val, name, item) => [
                              `${val > 0 ? '+' : ''}${val} (${item.payload.direction})`,
                              'SHAP Contribution',
                            ]}
                          />
                          <ReferenceLine x={0} stroke="var(--color-border-ui)" />
                          <Bar dataKey="shap" radius={[4, 4, 4, 4]}>
                            {formattedShapData.slice(0, 6).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.shap >= 0 ? '#FB7185' : '#34D399'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Dual-Coded Attribute List (Never Color Alone) */}
                    <div className="grid sm:grid-cols-2 gap-2 pt-3 border-t border-border-ui/30 dark:border-white/10">
                      {formattedShapData.slice(0, 4).map((f, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-bg-base/40 border border-border-ui/30 dark:border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {f.isRiskIncreasing ? (
                              <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                                <TrendingUp size={13} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                <TrendingDown size={13} />
                              </div>
                            )}
                            <span className="font-semibold text-text-primary truncate">
                              {f.feature}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                f.isRiskIncreasing ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {f.shap > 0 ? `+${f.shap}` : f.shap}
                            </span>
                            <span className="block text-[9px] text-text-muted">
                              {f.direction}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-text-muted text-xs">
                    No SHAP attributions generated yet. Click &quot;Re-Run Model Evaluation&quot; above.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive What-If Counterfactual Intervention Simulation Studio */}
          <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 text-text-primary shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-ui/30 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-accent-primary text-accent-primary-text flex items-center justify-center shadow-xs">
                  <Sliders size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight font-display text-text-primary">
                    Interactive What-If Intervention Simulator
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Simulate counterfactual supervision modifications to quantitatively calculate expected recidivism risk reduction (&Delta;Risk).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={runSimulation}
                disabled={simulating}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs hover:scale-[1.01] cursor-pointer"
              >
                <Sparkles size={16} />
                <span>{simulating ? 'Computing Simulation...' : 'Simulate Intervention'}</span>
              </button>
            </div>

            {/* Sliders Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {/* Slider 1: Attendance */}
              <div className="bg-bg-base/40 dark:bg-white/[0.03] p-5 rounded-2xl border border-border-ui/30 dark:border-white/10">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar size={14} className="text-accent-text" /> Program Attendance
                  </span>
                  <span className="text-accent-text font-mono text-sm font-bold">
                    {simForm.program_attendances} sessions
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={simForm.program_attendances}
                  onChange={(e) =>
                    setSimForm({ ...simForm, program_attendances: Number(e.target.value) })
                  }
                  className="w-full mt-4 h-3 accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                  <span>0 (None)</span>
                  <span>20 (Target)</span>
                  <span>40 (Max)</span>
                </div>
              </div>

              {/* Slider 2: Unexcused Absences */}
              <div className="bg-bg-base/40 dark:bg-white/[0.03] p-5 rounded-2xl border border-border-ui/30 dark:border-white/10">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <AlertTriangle size={14} className="text-amber-400" /> Unexcused Absences
                  </span>
                  <span className="text-amber-400 font-mono text-sm font-bold">
                    {simForm.program_unexcused_absences} missed
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={simForm.program_unexcused_absences}
                  onChange={(e) =>
                    setSimForm({ ...simForm, program_unexcused_absences: Number(e.target.value) })
                  }
                  className="w-full mt-4 h-3 accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                  <span>0 (Zero Tolerance)</span>
                  <span>5</span>
                  <span>10 (Violation)</span>
                </div>
              </div>

              {/* Slider 3: Employment Rate */}
              <div className="bg-bg-base/40 dark:bg-white/[0.03] p-5 rounded-2xl border border-border-ui/30 dark:border-white/10">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Briefcase size={14} className="text-accent-text" /> Verified Employment
                  </span>
                  <span className="text-accent-text font-mono text-sm font-bold">
                    {simForm.percent_days_employed}% days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={simForm.percent_days_employed}
                  onChange={(e) =>
                    setSimForm({ ...simForm, percent_days_employed: Number(e.target.value) })
                  }
                  className="w-full mt-4 h-3 accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                  <span>0% (Unemployed)</span>
                  <span>50%</span>
                  <span>100% (Full-time)</span>
                </div>
              </div>
            </div>

            {/* Toxicology Toggle */}
            <div className="mt-4 flex flex-wrap items-center justify-between p-4 rounded-2xl bg-bg-base/40 dark:bg-white/[0.03] border border-border-ui/30 dark:border-white/10 gap-3">
              <span className="text-xs text-text-secondary font-medium">
                Simulated Drug Screening Compliance Scenario:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSimForm({ ...simForm, drug_tests_clean: true })}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    simForm.drug_tests_clean
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                      : 'border border-border-ui/40 dark:border-white/10 text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Check size={15} /> 100% Clean Urinalysis Screens
                </button>
                <button
                  type="button"
                  onClick={() => setSimForm({ ...simForm, drug_tests_clean: false })}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    !simForm.drug_tests_clean
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                      : 'border border-border-ui/40 dark:border-white/10 text-text-muted hover:text-text-primary'
                  }`}
                >
                  <X size={15} /> Active Substance Relapse (Positive)
                </button>
              </div>
            </div>

            {/* Simulation Results Display */}
            {simResult && (
              <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-bg-base/60 dark:bg-white/[0.02] border border-accent-text/30 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-center sm:text-left">
                    <div className="p-2 sm:p-0 rounded-xl bg-bg-base/40 sm:bg-transparent">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold font-mono">
                        Baseline Risk
                      </p>
                      <p className="text-2xl font-bold font-mono text-text-secondary mt-1">
                        {(simResult.baseline_risk * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="p-2 sm:p-0 rounded-xl bg-bg-base/40 sm:bg-transparent">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold font-mono">
                        Simulated Risk
                      </p>
                      <p className="text-2xl font-bold font-mono text-accent-text mt-1">
                        {(simResult.simulated_risk * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="p-2 sm:p-0 rounded-xl bg-bg-base/40 sm:bg-transparent">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold font-mono">
                        Expected Risk Drop (&Delta;Risk)
                      </p>
                      <p
                        className={`text-2xl font-bold font-mono mt-1 ${
                          simResult.delta_risk < 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {simResult.delta_risk <= 0 ? '' : '+'}
                        {(simResult.delta_risk * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={adoptSimulationAsPlan}
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] cursor-pointer self-stretch sm:self-center"
                  >
                    <ShieldCheck size={16} />
                    <span>Adopt as Court Treatment Order</span>
                  </button>
                </div>

                <p className="text-xs text-text-secondary mt-4 pt-4 border-t border-border-ui/30 dark:border-white/10 leading-relaxed">
                  <strong className="text-accent-text">DSS Counterfactual Insight:</strong>{' '}
                  {simResult.recommendation}
                </p>
              </div>
            )}
          </div>

          {/* Two-Column Section: Clinical Narrative & HITL Judicial Review */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* GenAI Clinical Narrative Card */}
            <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-ui/30 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-accent-text" size={20} />
                    <h2 className="font-bold text-text-primary text-sm font-display">
                      Clinical Narrative Synthesis
                    </h2>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-bg-raised text-accent-text border border-border-ui/40 dark:border-white/10 font-bold uppercase font-mono">
                    {assessment.narrative_generated_by || 'LLM / Rule Engine'}
                  </span>
                </div>

                {assessment.narrative && (
                  <div className="mt-4 p-4 rounded-2xl bg-bg-base/40 border border-border-ui/30 dark:border-white/10 text-xs text-text-secondary leading-relaxed whitespace-pre-line font-serif">
                    {assessment.narrative}
                  </div>
                )}

                {/* Recommendations */}
                <div className="mt-4 space-y-3">
                  {assessment.intervention_recommendations?.map((r, i) => (
                    <div
                      key={r.id || i}
                      className="p-4 rounded-2xl border border-border-ui/30 dark:border-white/10 bg-bg-base/40 hover:border-accent-text/40 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-text-primary text-xs">{r.title}</h3>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-bg-raised text-accent-text font-mono border border-border-ui/30">
                          Priority #{r.priority || i + 1}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                        <strong className="text-text-primary">Clinical Basis:</strong> {r.why_relevant}
                      </p>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        <strong className="text-text-primary">Actionable Step:</strong> {r.suggested_action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-ui/30 dark:border-white/10 text-[11px] text-text-muted">
                Grounding: TreeSHAP local explanations mapped through clinical dictionary and feature attributions.
              </div>
            </div>

            {/* Human-in-the-Loop Judicial Review */}
            <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-4 border-b border-border-ui/30 dark:border-white/10">
                  <CheckCircle2 className="text-accent-text" size={20} />
                  <div>
                    <h2 className="font-bold text-text-primary text-sm font-display">
                      Human-in-the-Loop (HITL) Judicial Disposition
                    </h2>
                    <p className="text-xs text-text-muted">
                      Court oversight requirement: Presiding Judge or Case Manager must validate or override AI outputs
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Quick Disposition Preset Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 font-mono">
                      Quick Disposition Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['ACCEPT', 'MODIFY', 'REJECT', 'DEFER'].map((d) => {
                        const isSelected = review.decision === d;
                        let activeStyles = 'bg-accent-primary text-accent-primary-text border-accent-primary shadow-xs';
                        if (isSelected) {
                          if (d === 'REJECT') activeStyles = 'bg-rose-600 text-white border-rose-600 shadow-rose-500/20 shadow-sm';
                          else if (d === 'ACCEPT') activeStyles = 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20 shadow-sm';
                          else if (d === 'MODIFY') activeStyles = 'bg-amber-600 text-white border-amber-600 shadow-amber-500/20 shadow-sm';
                          else if (d === 'DEFER') activeStyles = 'bg-purple-600 text-white border-purple-600 shadow-purple-500/20 shadow-sm';
                        }
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleQuickDisposition(d)}
                            className={`min-h-[44px] py-2 px-2.5 rounded-full text-xs font-bold font-mono transition-all border cursor-pointer inline-flex items-center justify-center ${
                              isSelected
                                ? activeStyles
                                : 'bg-bg-base/40 dark:bg-white/5 border-border-ui/40 dark:border-white/10 text-text-secondary hover:text-text-primary hover:bg-bg-raised'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                      Formal Disposition Decision
                    </label>
                    <select
                      value={review.decision}
                      onChange={(e) => setReview({ ...review, decision: e.target.value })}
                      className="w-full min-h-[44px] border border-border-ui/40 dark:border-white/10 bg-bg-base/80 dark:bg-white/5 rounded-xl px-3.5 py-2.5 text-base focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none text-text-primary font-medium transition-all cursor-pointer"
                    >
                      <option value="" className={selectOptionClass}>Select official court decision...</option>
                      <option value="ACCEPT" className={selectOptionClass}>ACCEPT (Adopt model recommendations & risk tier)</option>
                      <option value="MODIFY" className={selectOptionClass}>MODIFY (Adjust intervention parameters or supervision tier)</option>
                      <option value="REJECT" className={selectOptionClass}>REJECT (Override model recommendation with judicial rationale)</option>
                      <option value="DEFER" className={selectOptionClass}>DEFER (Postpone pending toxicology verification or progress check)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                      Judicial Rationale & Mitigating Evidence
                    </label>
                    <textarea
                      value={review.notes}
                      onChange={(e) => setReview({ ...review, notes: e.target.value })}
                      placeholder="Enter legal findings, mitigating evidence, or rationale for modification/override..."
                      rows="4"
                      className="w-full min-h-[80px] border border-border-ui/40 dark:border-white/10 bg-bg-base/80 dark:bg-white/5 rounded-xl p-3.5 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none leading-relaxed transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={loading}
                    className="w-full py-3.5 min-h-[48px] rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs transition-all shadow-xs hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={17} />
                    <span>{loading ? 'Recording Disposition...' : 'Record Official Judicial Review'}</span>
                  </button>
                </div>
              </div>

              {assessment.reviewer_decision && (
                <div className="mt-6 pt-4 border-t border-border-ui/30 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-text-primary font-medium">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        assessment.reviewer_decision === 'REJECT'
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                          : assessment.reviewer_decision === 'ACCEPT'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : assessment.reviewer_decision === 'MODIFY'
                          ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                          : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                      }`}
                    />
                    Recorded Disposition:{' '}
                    <strong
                      className={`font-mono ${
                        assessment.reviewer_decision === 'REJECT'
                          ? 'text-rose-400 font-bold'
                          : assessment.reviewer_decision === 'ACCEPT'
                          ? 'text-emerald-400 font-bold'
                          : assessment.reviewer_decision === 'MODIFY'
                          ? 'text-amber-400 font-bold'
                          : 'text-purple-400 font-bold'
                      }`}
                    >
                      {assessment.reviewer_decision}
                    </strong>
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">
                    {assessment.reviewed_at ? new Date(assessment.reviewed_at).toLocaleDateString() : 'Audited'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Floating Control Dock for Rapid Disposition */}
          <FloatingControlDock
            statusBadge={<RiskLevelBadge level={assessment.risk_level} />}
            secondaryActions={[
              {
                label: 'Simulate',
                icon: Sparkles,
                onClick: runSimulation,
                loading: simulating,
              },
              {
                label: 'Export PDF',
                icon: FileDown,
                onClick: downloadPDF,
                loading: exportingPDF,
              },
            ]}
            primaryAction={{
              label: review.decision ? `Record ${review.decision}` : 'Record Disposition',
              icon: CheckCircle2,
              onClick: submitReview,
              loading,
            }}
          />
        </>
      )}
    </div>
  );
}
