import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, AlertTriangle, Clock3, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { participantsAPI } from '../services/api';

function Card({ title, value, icon: Icon, note }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {note && <p className="text-xs text-slate-400 mt-2">{note}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [participants, setParticipants] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    participantsAPI.list({ page: 1, size: 8 })
      .then(r => setParticipants(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items = participants.items || [];
  const highRisk = items.filter(p => p.latest_risk_level === 'HIGH').length;
  const pending = items.filter(p => !p.latest_assessment_date).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
        <div>
          <p className="text-sm text-teal-700 font-semibold">Decision Support Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Drug Court Overview</h1>
          <p className="text-slate-500 mt-1">Review participants, assessments, explanations and intervention plans.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/participants/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800">
            <Plus size={18}/> Add Participant
          </Link>
          <Link to="/assessments/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50">
            <ClipboardList size={18}/> New Assessment
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Participants" value={participants.total ?? 0} icon={Users} note="From the live participant API"/>
        <Card title="High Risk on Page" value={highRisk} icon={AlertTriangle} note="Based on latest available assessments"/>
        <Card title="Awaiting Assessment" value={pending} icon={Clock3} note="Participants without a visible assessment"/>
        <Card title="System Status" value="Healthy" icon={ShieldCheck} note="Connected to FastAPI"/>
      </div>

      <div className="mt-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Recent Participants</h2>
            <p className="text-xs text-slate-500 mt-1">Open a profile to start an assessment or add notes.</p>
          </div>
          <Link to="/participants" className="text-sm font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">View All <ArrowRight size={16}/></Link>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading participants...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto text-slate-300" size={38}/>
            <p className="font-semibold text-slate-700 mt-3">No participants yet</p>
            <p className="text-sm text-slate-500 mt-1">Create your first participant to begin the workflow.</p>
            <Link to="/participants/new" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold">Add Participant</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(p => (
              <Link key={p.id} to={`/participants/${p.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.participant_id} · {p.program_status || 'Active'}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                    p.latest_risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                    p.latest_risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                    p.latest_risk_level === 'LOW' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{p.latest_risk_level || 'Not assessed'}</span>
                  {p.latest_risk_score != null && <p className="text-xs text-slate-400 mt-1">{(p.latest_risk_score * 100).toFixed(1)}%</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <strong>Prototype notice:</strong> model outputs are advisory and require professional review. Use synthetic/demo data only unless your authorized dataset is connected.
      </div>
    </div>
  );
}
