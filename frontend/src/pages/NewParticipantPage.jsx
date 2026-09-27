import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { participantsAPI } from '../services/api';
import toast from 'react-hot-toast';

const initial = {
  first_name:'', last_name:'', age:'', gender:'', race:'', ethnicity:'', marital_status:'',
  employment_status:'', monthly_income:'', education_level:'', num_dependents:'0', housing_status:'',
  child_support:false, prior_arrests:'0', prior_felonies:'0', age_first_arrest:'', arrest_frequency:'0',
  sanctions_count:'0', incentives_count:'0', risk_assessment_score:'', substance_use_frequency:'',
  trauma_score:'0', ace_score:'0', program_status:'Active'
};

const labels = {
 first_name:'First name', last_name:'Last name', age:'Age', gender:'Gender',
 race:'Race (stored only; not used by prediction)', ethnicity:'Ethnicity', marital_status:'Marital status',
 employment_status:'Employment status', monthly_income:'Monthly income', education_level:'Education level',
 num_dependents:'Number of dependents', housing_status:'Housing status', prior_arrests:'Prior arrests',
 prior_felonies:'Prior felonies', age_first_arrest:'Age at first arrest', arrest_frequency:'Arrest frequency',
 sanctions_count:'Sanctions count', incentives_count:'Incentives count', risk_assessment_score:'Risk assessment score',
 substance_use_frequency:'Substance-use frequency', trauma_score:'Trauma score', ace_score:'ACE score'
};
const numeric = new Set(['age','monthly_income','num_dependents','prior_arrests','prior_felonies','age_first_arrest','arrest_frequency','sanctions_count','incentives_count','risk_assessment_score','trauma_score','ace_score']);

export default function NewParticipantPage() {
 const navigate = useNavigate();
 const [form,setForm] = useState(initial);
 const [saving,setSaving] = useState(false);
 const onChange = e => setForm(f => ({...f, [e.target.name]: e.target.type==='checkbox' ? e.target.checked : e.target.value}));
 const submit = async e => {
   e.preventDefault(); setSaving(true);
   try {
     const payload = {...form};
     for (const k of numeric) payload[k] = payload[k] === '' ? null : Number(payload[k]);
     const res = await participantsAPI.create(payload);
     toast.success('Participant created successfully');
     navigate(`/participants/${res.data.id}`);
   } catch (e) { toast.error(e.response?.data?.detail || 'Could not create participant'); }
   finally { setSaving(false); }
 };
 return <div className="p-6 md:p-8 max-w-6xl mx-auto">
   <button onClick={()=>navigate(-1)} className="text-sm text-slate-500 inline-flex gap-2 items-center mb-5"><ArrowLeft size={16}/> Back</button>
   <div className="mb-6"><h1 className="text-3xl font-bold text-slate-900">Add Participant</h1><p className="text-slate-500 mt-1">Enter participant information used by the DSS workflow.</p></div>
   <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
     <div className="grid md:grid-cols-3 gap-4">
       {Object.keys(labels).map(k => <div key={k}>
         <label className="block text-sm font-semibold text-slate-700 mb-1.5">{labels[k]}</label>
         <input name={k} type={numeric.has(k)?'number':'text'} step={k==='arrest_frequency'||k==='monthly_income'||k==='risk_assessment_score'||k==='trauma_score'?'0.1':undefined} value={form[k]} onChange={onChange} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-200 outline-none"/>
       </div>)}
       <div className="flex items-center gap-2 pt-7"><input name="child_support" type="checkbox" checked={form.child_support} onChange={onChange}/><label className="text-sm font-semibold text-slate-700">Child support</label></div>
       <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Program status</label><select name="program_status" value={form.program_status} onChange={onChange} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg"><option>Active</option><option>Completed</option><option>Inactive</option></select></div>
     </div>
     <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={()=>navigate(-1)} className="px-4 py-2.5 border rounded-lg">Cancel</button><button disabled={saving} className="px-5 py-2.5 rounded-lg bg-teal-700 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60"><Save size={17}/>{saving?'Saving...':'Save Participant'}</button></div>
   </form>
 </div>;
}
