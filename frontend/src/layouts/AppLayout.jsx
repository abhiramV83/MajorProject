import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, ClipboardList, Activity, BarChart3, Shield, BookOpen, Settings, LogOut, Scale, Brain, UserCog } from 'lucide-react';

const nav = [
 ['/dashboard','Dashboard',LayoutDashboard,['ADMIN','JUDGE','CASE_MANAGER','TREATMENT_PROVIDER','PROBATION_OFFICER']],
 ['/participants','Participants',Users,['ADMIN','JUDGE','CASE_MANAGER','TREATMENT_PROVIDER','PROBATION_OFFICER']],
 ['/assessments','Assessments',ClipboardList,['ADMIN','JUDGE','CASE_MANAGER','TREATMENT_PROVIDER','PROBATION_OFFICER']],
 ['/interventions','Intervention Plans',Activity,['ADMIN','JUDGE','CASE_MANAGER','TREATMENT_PROVIDER','PROBATION_OFFICER']],
 ['/analytics','Analytics',BarChart3,['ADMIN','JUDGE','CASE_MANAGER']],
 ['/fairness','Fairness',Scale,['ADMIN','JUDGE']],
 ['/model-performance','Model Performance',Brain,['ADMIN','JUDGE','CASE_MANAGER']],
 ['/model-card','Model Card',BookOpen,['ADMIN','JUDGE','CASE_MANAGER','TREATMENT_PROVIDER','PROBATION_OFFICER']],
 ['/audit-logs','Audit Logs',Shield,['ADMIN','JUDGE']]
];

export default function AppLayout({children}){
 const {user,logout}=useAuth(); const loc=useLocation(); const navg=useNavigate();
 const active=p=>loc.pathname===p||loc.pathname.startsWith(p+'/');
 return <div className="min-h-screen bg-slate-50 flex">
  <aside className="w-72 bg-[#0b3d3b] text-white fixed inset-y-0 left-0 z-20 flex flex-col">
   <div className="px-5 py-5 border-b border-white/10">
    <Link to="/dashboard" className="flex items-center gap-3">
     <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center text-xl">⚖</div>
     <div><div className="font-bold text-lg">Drug Court</div><div className="text-xs text-teal-200">DSS Platform</div></div>
    </Link>
   </div>
   <div className="px-5 py-4 text-xs text-teal-200 uppercase tracking-widest font-bold">Main</div>
   <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
    {nav.filter(x=>x[3].includes(user?.role)).map(([path,label,Icon])=><Link key={path} to={path} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${active(path)?'bg-teal-700 text-teal-100':'text-slate-200 hover:bg-white/10'}`}><Icon size={20}/><span>{label}</span></Link>)}
    <div className="pt-5 px-2 text-xs text-teal-200 uppercase tracking-widest font-bold">Account</div>
    <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl ${active('/settings')?'bg-teal-700 text-teal-100':'text-slate-200 hover:bg-white/10'}`}><Settings size={20}/><span>Settings</span></Link>
    {user?.role==='ADMIN'&&<Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl ${active('/admin')?'bg-teal-700 text-teal-100':'text-slate-200 hover:bg-white/10'}`}><UserCog size={20}/><span>Admin</span></Link>}
   </nav>
   <div className="p-4 border-t border-white/10">
    <div className="text-xs text-teal-200 mb-3">Prototype Environment · Advisory use only</div>
    <button onClick={()=>{logout();navg('/login')}} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-200 hover:bg-white/10"><LogOut size={20}/> Sign out</button>
   </div>
  </aside>
  <main className="ml-72 min-h-screen flex-1">{children}</main>
 </div>
}
