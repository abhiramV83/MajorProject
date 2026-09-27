import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, MessageSquare, Pencil } from 'lucide-react';
import { participantsAPI, assessmentsAPI, interventionsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ParticipantProfilePage() {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return Promise.all([
      participantsAPI.get(participantId),
      assessmentsAPI.getForParticipant(participantId),
      participantsAPI.getNotes(participantId),
      interventionsAPI.getForParticipant(participantId),
    ])
      .then(([a, b, c, d]) => {
        setP(a.data);
        setAssessments(b.data);
        setNotes(c.data);
        setPlans(d.data);
      })
      .catch((err) => toast.error(err.response?.data?.detail || 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, [participantId]);

  useEffect(() => {
    load();
  }, [load]);

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await participantsAPI.addNote(participantId, { note_type: 'general', content: note });
      setNote('');
      toast.success('Note added');
      load();
    } catch {
      toast.error('Could not add note');
    }
  };

  if (loading)
    return <div className="p-10 text-center text-slate-500 font-medium">Loading participant...</div>;
  if (!p) return <div className="p-10 text-center text-slate-500">Participant not found.</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-slate-500 hover:text-slate-800 transition-colors inline-flex gap-2 items-center mb-5"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div>
            <p className="text-xs text-teal-700 font-bold uppercase tracking-wider">
              {p.participant_id}
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {p.first_name} {p.last_name}
            </h1>
            <p className="text-slate-500 mt-1">
              {p.program_status || 'Active'} · {p.age ? `${p.age} years` : 'Age not recorded'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/participants/${p.id}/edit`}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex gap-2 items-center text-sm font-medium transition-colors"
            >
              <Pencil size={16} /> Edit
            </Link>
            <Link
              to={`/assessments/new?participant=${p.id}`}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg inline-flex gap-2 items-center text-sm font-medium transition-colors shadow-sm"
            >
              <ClipboardList size={16} /> New Assessment
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mt-6">
          {[
            ['Employment', p.employment_status],
            ['Education', p.education_level],
            ['Housing', p.housing_status],
            ['Substance use', p.substance_use_frequency],
            ['Prior arrests', p.prior_arrests],
            ['Prior felonies', p.prior_felonies],
            ['Trauma score', p.trauma_score],
            ['ACE score', p.ace_score],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium">{k}</p>
              <p className="font-semibold text-slate-800 mt-1">{v ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-bold text-slate-900">Assessment History</h2>
            <Link
              to={`/assessments/new?participant=${p.id}`}
              className="text-teal-700 text-sm font-semibold hover:underline"
            >
              + New
            </Link>
          </div>
          {assessments.length ? (
            <div className="divide-y">
              {assessments.map((a) => (
                <Link
                  key={a.id}
                  to={`/assessments/${a.id}`}
                  className="block p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">Assessment #{a.id}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(a.assessment_date).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {a.risk_level || 'Pending'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">No assessments yet.</div>
          )}
        </section>

        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-bold text-slate-900">Intervention Plans</h2>
            <Link
              to={`/interventions?participant=${p.id}`}
              className="text-teal-700 text-sm font-semibold hover:underline"
            >
              + Create
            </Link>
          </div>
          {plans.length ? (
            <div className="divide-y">
              {plans.map((x) => (
                <div key={x.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-slate-800">{x.title}</p>
                    <span className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-700 font-semibold">
                      {x.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {x.description || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">No intervention plans yet.</div>
          )}
        </section>
      </div>

      <section className="bg-white border rounded-2xl shadow-sm mt-6 p-5">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-teal-700" />
          <h2 className="font-bold text-slate-900">Case Notes</h2>
        </div>
        <div className="flex gap-2 mt-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a case note..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <button
            onClick={addNote}
            className="px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors text-sm"
          >
            Add Note
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-sm text-slate-800">{n.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
