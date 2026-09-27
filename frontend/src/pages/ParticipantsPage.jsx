import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye, RefreshCw } from 'lucide-react';
import { participantsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ParticipantsPage() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    participantsAPI
      .list({
        search: search || undefined,
        program_status: status || undefined,
        page: 1,
        size: 50,
      })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.detail || 'Unable to load participants'))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Participants</h1>
          <p className="text-slate-500 mt-1">Create, search and review drug court participants.</p>
        </div>
        <Link to="/participants/new" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800">
          <Plus size={18}/> Add Participant
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-5">
        <div className="grid md:grid-cols-[1fr_180px_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search name or participant ID" className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-teal-200"/>
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-300">
            <option value="">All statuses</option><option value="Active">Active</option><option value="Completed">Completed</option><option value="Inactive">Inactive</option>
          </select>
          <button onClick={load} className="px-4 py-2.5 rounded-lg border border-slate-300 font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-50"><RefreshCw size={17}/> Search</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between">
          <span className="font-semibold text-slate-800">{data.total || 0} participant(s)</span>
          <Link to="/participants/new" className="text-sm text-teal-700 font-semibold">+ Add new</Link>
        </div>
        {loading ? <div className="p-10 text-center text-slate-500">Loading...</div> :
        data.items?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr>
                <th className="text-left px-5 py-3">Participant</th><th className="text-left px-4 py-3">Age</th><th className="text-left px-4 py-3">Employment</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Latest Risk</th><th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map(p => <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-semibold text-slate-800">{p.first_name} {p.last_name}</p><p className="text-xs text-slate-400">{p.participant_id}</p></td>
                  <td className="px-4 py-4">{p.age ?? '—'}</td><td className="px-4 py-4">{p.employment_status || '—'}</td><td className="px-4 py-4">{p.program_status || '—'}</td>
                  <td className="px-4 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.latest_risk_level==='HIGH'?'bg-red-100 text-red-700':p.latest_risk_level==='MEDIUM'?'bg-amber-100 text-amber-700':p.latest_risk_level==='LOW'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>{p.latest_risk_level || 'Not assessed'}</span></td>
                  <td className="px-4 py-4 text-right"><Link to={`/participants/${p.id}`} className="inline-flex items-center gap-1 text-teal-700 font-semibold"><Eye size={16}/> View</Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <div className="p-12 text-center text-slate-500">No participants found. <Link className="text-teal-700 font-semibold" to="/participants/new">Add one</Link>.</div>}
      </div>
    </div>
  );
}
