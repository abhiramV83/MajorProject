import { useEffect, useState } from 'react';
import { modelAPI } from '../services/api';

export default function AnalyticsPage(){
 const [performance,setPerformance]=useState(null); const [global,setGlobal]=useState(null);
 useEffect(()=>{modelAPI.getPerformance().then(r=>setPerformance(r.data)).catch(()=>{});modelAPI.getGlobalExplanations().then(r=>setGlobal(r.data)).catch(()=>{})},[]);
 const metrics=performance?.performance_data||performance||{};
 return <div className="p-6 md:p-8 max-w-7xl mx-auto"><h1 className="text-3xl font-bold">Analytics</h1><p className="text-slate-500 mt-1">Model and explanation analytics from the FastAPI backend.</p><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">{[['Accuracy',metrics.accuracy],['Precision',metrics.precision_score],['Recall',metrics.recall_score],['ROC-AUC',metrics.roc_auc]].map(([k,v])=><div key={k} className="bg-white border rounded-2xl p-5"><p className="text-sm text-slate-500">{k}</p><p className="text-3xl font-bold mt-2">{v==null?'—':`${(Number(v)*100).toFixed(1)}%`}</p></div>)}</div><div className="grid lg:grid-cols-2 gap-5 mt-5"><section className="bg-white border rounded-2xl p-5"><h2 className="font-bold">Global explanations</h2><pre className="mt-4 text-xs bg-slate-50 rounded-xl p-4 overflow-auto max-h-96">{JSON.stringify(global,null,2)||'No data'}</pre></section><section className="bg-white border rounded-2xl p-5"><h2 className="font-bold">Performance details</h2><pre className="mt-4 text-xs bg-slate-50 rounded-xl p-4 overflow-auto max-h-96">{JSON.stringify(performance,null,2)||'No data'}</pre></section></div></div>
}
