import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { participantsAPI } from '../services/api';
import toast from 'react-hot-toast';

const numeric = new Set(['age','monthly_income','num_dependents','prior_arrests','prior_felonies','age_first_arrest','arrest_frequency','sanctions_count','incentives_count','risk_assessment_score','trauma_score','ace_score']);
const fields = [
 ['first_name','First name'],['last_name','Last name'],['age','Age'],['gender','Gender'],
 ['race','Race (stored only; not used by prediction)'],['ethnicity','Ethnicity'],['marital_status','Marital status'],
 ['employment_status','Employment status'],['monthly_income','Monthly income'],['education_level','Education level'],
 ['num_dependents','Number of dependents'],['housing_status','Housing status'],['prior_arrests','Prior arrests'],
 ['prior_felonies','Prior felonies'],['age_first_arrest','Age at first arrest'],['arrest_frequency','Arrest frequency'],
 ['sanctions_count','Sanctions count'],['incentives_count','Incentives count'],['risk_assessment_score','Risk assessment score'],
 ['substance_use_frequency','Substance-use frequency'],['trauma_score','Trauma score'],['ace_score','ACE score']
];

export default function ParticipantEditPage(){
 const {participantId}=useParams(); const navigate=useNavigate();
 const [form,setForm]=useState(null); const [saving,setSaving]=useState(false);
 useEffect(()=>{participantsAPI.get(participantId).then(r=>setForm(r.data)).catch(e=>toast.error(e.response?.data?.detail||'Unable to load participant'))},[participantId]);
 if(!form) return <div className="p-10 text-center text-slate-500">Loading participant...</div>;
 const change=e=>setForm({...form,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value});
 const save=async e=>{
   e.preventDefault(); setSaving(true);
   try{
     const payload={...form};
     delete payload.id; delete payload.participant_id; delete payload.created_at; delete payload.enrollment_date;
     for(const k of numeric) payload[k]=payload[k]===''?null:Number(payload[k]);
     await participantsAPI.update(participantId,payload);
     toast.success('Participant updated'); navigate(`/participants/${participantId}`);
   }catch(e){toast.error(e.response?.data?.detail||'Could not update participant')}
   finally{setSaving(false)}
 };
 return <div className="p-6 md:p-8 max-w-6xl mx-auto">
   <button onClick={()=>navigate(-1)} className="text-sm text-slate-500 mb-5">← Back</button>
   <h1 className="text-3xl font-bold">Edit Participant</h1>
   <form onSubmit={save} className="bg-white border rounded-2xl p-6 shadow-sm mt-6">
    <div className="grid md:grid-cols-3 gap-4">
     {fields.map(([k,label])=><div key={k}><label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label><input name={k} type={numeric.has(k)?'number':'text'} value={form[k]??''} onChange={change} className="w-full border rounded-lg px-3 py-2.5"/></div>)}
     <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Program status</label><select name="program_status" value={form.program_status||'Active'} onChange={change} className="w-full border rounded-lg px-3 py-2.5"><option>Active</option><option>Completed</option><option>Inactive</option></select></div>
     <label className="flex items-center gap-2 pt-7 text-sm font-semibold"><input type="checkbox" name="child_support" checked={!!form.child_support} onChange={change}/> Child support</label>
    </div>
    <div className="flex justify-end mt-6"><button disabled={saving} className="px-5 py-2.5 bg-teal-700 text-white rounded-lg font-semibold">{saving?'Saving...':'Save Changes'}</button></div>
   </form>
 </div>
}
