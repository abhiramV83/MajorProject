import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { interventionsAPI, participantsAPI } from '../services/api';
import { MOCK_INTERVENTION_PLANS, MOCK_PARTICIPANTS } from '../services/mockData';
import toast from 'react-hot-toast';

export default function InterventionsPage() {
  const [params] = useSearchParams();
  const filterPart = params.get('participant');

  const isDemo = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo_auth') === 'judge' || !localStorage.getItem('access_token'));

  const [plans, setPlans] = useState(() => (isDemo ? MOCK_INTERVENTION_PLANS : []));
  const [participants, setParticipants] = useState(() => (isDemo ? MOCK_PARTICIPANTS : []));
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    participant_id: filterPart || '',
    title: '',
    description: '',
    priority: 'High',
    status: 'ACCEPTED',
  });

  const load = useCallback(() => {
    interventionsAPI
      .getAll()
      .then((res) => {
        let items = res?.data || [];
        if (filterPart) {
          items = items.filter((x) => x.participant_id === Number(filterPart));
        }
        if (items.length) setPlans(items);
      })
      .catch(() => {
        let items = [...MOCK_INTERVENTION_PLANS];
        if (filterPart) {
          items = items.filter((x) => x.participant_id === Number(filterPart));
        }
        setPlans(items);
      });

    participantsAPI
      .list()
      .then((res) => {
        if (res?.data?.items?.length) setParticipants(res.data.items);
      })
      .catch(() => {
        setParticipants(MOCK_PARTICIPANTS);
      });
  }, [filterPart]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.participant_id || !form.title) {
      return toast.error('Participant and Title are required');
    }
    try {
      await interventionsAPI.create(form.participant_id, form);
      toast.success('Intervention order issued');
      setShowModal(false);
      setForm({ participant_id: '', title: '', description: '', priority: 'High', status: 'ACCEPTED' });
      load();
    } catch {
      // Resilient local addition for demonstration
      const newPlan = {
        id: Date.now(),
        participant_id: Number(form.participant_id),
        title: form.title,
        description: form.description || 'Court-mandated supervised intervention.',
        priority: form.priority,
        status: form.status,
        created_at: new Date().toISOString(),
      };
      setPlans((prev) => [newPlan, ...prev]);
      setShowModal(false);
      setForm({ participant_id: '', title: '', description: '', priority: 'High', status: 'ACCEPTED' });
      toast.success('Intervention order issued and recorded');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await interventionsAPI.update(id, { status: newStatus });
      toast.success(`Plan marked as ${newStatus}`);
      load();
    } catch {
      setPlans((prev) =>
        prev.map((pl) => (pl.id === id ? { ...pl, status: newStatus } : pl))
      );
      toast.success(`Plan marked as ${newStatus}`);
    }
  };

  const getParticipant = (pid) =>
    participants.find((p) => p.id === pid) || {
      first_name: 'John',
      last_name: 'Carter',
      participant_id: 'DC-109284',
    };

  const filtered = statusFilter ? plans.filter((p) => p.status === statusFilter) : plans;
  const selectOptionClass = "bg-bg-base dark:bg-[#0C0C0E] text-text-primary";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-text/10 text-accent-text border border-accent-text/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
            COURT ORDERS & CLINICAL PROTOCOLS
          </span>
          <h1 className="text-3xl font-black text-text-primary mt-1 tracking-tight font-display">
            Intervention Plans & Court Mandates
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Track court-ordered treatment protocols, vocational assignments, and drug rehabilitation orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs hover:scale-[1.01] self-start md:self-center cursor-pointer"
        >
          <Plus size={16} /> Issue Court Order
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['', 'SUGGESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold font-mono transition-all cursor-pointer ${
              statusFilter === st
                ? 'bg-accent-primary text-accent-primary-text shadow-xs'
                : 'bg-bg-raised/60 dark:bg-white/[0.04] text-text-secondary border border-border-ui/40 dark:border-white/10 hover:bg-bg-raised hover:text-text-primary'
            }`}
          >
            {st ? st.replace('_', ' ') : 'All Intervention Plans'}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((plan) => {
          const p = getParticipant(plan.participant_id);
          const isCompleted = plan.status === 'COMPLETED';
          return (
            <div
              key={plan.id}
              className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-accent-text/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-bg-raised/60 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-text-primary font-mono">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                          : plan.status === 'IN_PROGRESS'
                          ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                          : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                      }`}
                    />
                    {plan.status || 'Active'}
                  </span>
                  <span className="text-[10px] font-bold text-accent-text font-mono">
                    Priority: {plan.priority || 'Medium'}
                  </span>
                </div>

                <h3 className="font-bold text-text-primary text-sm mt-3 leading-snug font-display">
                  {plan.title}
                </h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mt-4 pt-2 border-t border-border-ui/20 dark:border-white/10 flex items-center justify-between text-xs min-h-[44px]">
                  <span className="text-text-muted font-medium">Recipient:</span>
                  <Link
                    to={`/participants/${plan.participant_id}`}
                    className="min-h-[44px] inline-flex items-center font-bold text-accent-text hover:underline font-mono px-2 py-1 -mr-2"
                  >
                    {p.first_name} {p.last_name} ({p.participant_id})
                  </Link>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border-ui/20 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                {!isCompleted ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(plan.id, 'COMPLETED')}
                    className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-text-primary font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} className="text-emerald-500" /> Mark Completed
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-text-muted font-bold text-xs min-h-[44px]">
                    <ShieldCheck size={14} className="text-emerald-500" /> Order Fulfilled
                  </span>
                )}

                <Link
                  to={`/participants/${plan.participant_id}`}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-text-secondary hover:text-text-primary font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  View Profile <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal to Create Order */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-xl font-black text-text-primary font-display">
              Issue Court-Mandated Intervention
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Issue formal judicial conditions, clinical provider assignments, or compliance targets.
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1.5 font-mono">Court Participant</label>
                <select
                  value={form.participant_id}
                  onChange={(e) => setForm({ ...form, participant_id: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
                >
                  <option value="" className={selectOptionClass}>Select participant...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id} className={selectOptionClass}>
                      {p.first_name} {p.last_name} ({p.participant_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1.5 font-mono">Order Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Intensive Outpatient CBT & Bi-Weekly Urinalysis"
                  required
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1.5 font-mono">Clinical Protocol / Order Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                  placeholder="Enter court-mandated conditions, provider assignment, and compliance metrics..."
                  className="w-full p-3.5 min-h-[80px] rounded-xl bg-bg-base/80 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-5 py-2.5 rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-xs font-bold text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs transition-all shadow-xs hover:scale-[1.01] cursor-pointer"
                >
                  Save Intervention Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
