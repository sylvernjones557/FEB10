
import React from 'react';
import { 
  FileText, 
  Target, 
  Code, 
  Palette, 
  Layout, 
  ShieldCheck, 
  Cpu, 
  Activity,
  Layers
} from 'lucide-react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/10 text-indigo-400 rounded-full border border-indigo-500/20 text-xs font-bold tracking-widest uppercase">
          Enterprise Solution
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter">PRD: SMART PRESENCE</h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Technical Specifications for the Next-Generation AI-Driven Institutional Attendance Infrastructure.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {/* Section 1: Vision */}
        <div className="glass p-10 rounded-[2.5rem] border border-slate-800 space-y-6">
          <div className="flex items-center gap-4 text-indigo-400">
            <Target size={32} />
            <h2 className="text-2xl font-bold text-white">1. Strategic Vision</h2>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Smart Presence is engineered to eliminate the friction of manual attendance tracking. By leveraging high-fidelity computer vision and role-based architectural patterns, the platform converts a reactive administrative task into a proactive, data-rich insight stream.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
             <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
               <h4 className="font-bold text-white mb-2">Automated Governance</h4>
               <p className="text-sm text-slate-500">Real-time facial verification ensures data integrity and prevents proxy attendance.</p>
             </div>
             <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
               <h4 className="font-bold text-white mb-2">Institutional Intelligence</h4>
               <p className="text-sm text-slate-500">Advanced analytics identify patterns in absenteeism before they impact performance.</p>
             </div>
          </div>
        </div>

        {/* Section 2: UI/UX Architecture */}
        <div className="glass p-10 rounded-[2.5rem] border border-slate-800 space-y-6">
          <div className="flex items-center gap-4 text-purple-400">
            <Palette size={32} />
            <h2 className="text-2xl font-bold text-white">2. Design Systems</h2>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The visual identity follows the <strong>"Aero-Glass"</strong> design language—combining translucent materials with high-contrast typography to ensure readability in variable lighting (classrooms vs offices).
          </p>
          <ul className="space-y-4 text-slate-400">
            <li className="flex gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></div>
              <span><strong>Dark Aesthetic:</strong> Slate-950 background reduces eye strain during prolonged administrative sessions.</span>
            </li>
            <li className="flex gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></div>
              <span><strong>Micro-Interactions:</strong> Spring-based animations (Framer Motion style) provide tactile feedback for successful detections.</span>
            </li>
            <li className="flex gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></div>
              <span><strong>Adaptive Layouts:</strong> Flex-grid system switches between compact mobile lists and multi-column desktop dashboards.</span>
            </li>
          </ul>
        </div>

        {/* Section 3: Tech Stack & Implementation */}
        <div className="glass p-10 rounded-[2.5rem] border border-slate-800 space-y-6">
          <div className="flex items-center gap-4 text-emerald-400">
            <Layers size={32} />
            <h2 className="text-2xl font-bold text-white">3. Frontend Specifications</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
               <Cpu className="text-emerald-500 shrink-0" size={24} />
               <div>
                 <h4 className="font-bold text-white">Core Framework</h4>
                 <p className="text-sm text-slate-500 mt-1">React 18+ with strict TypeScript typing. Concurrent rendering for smooth UI transitions during heavy data processing.</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
               <Activity className="text-emerald-500 shrink-0" size={24} />
               <div>
                 <h4 className="font-bold text-white">Data Visualization</h4>
                 <p className="text-sm text-slate-500 mt-1">Recharts library for SVG-based responsive analytics. Custom-themed to match the dark slate aesthetic.</p>
               </div>
            </div>
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
               <ShieldCheck className="text-emerald-500 shrink-0" size={24} />
               <div>
                 <h4 className="font-bold text-white">Role-Based Gatekeeping</h4>
                 <p className="text-sm text-slate-500 mt-1">Conditional route rendering. Admin view exposes system-wide configuration; Staff view encapsulates classroom workflows.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Section 4: User Journeys */}
        <div className="space-y-6">
           <h3 className="text-2xl font-bold text-white px-4">4. Key Workflows</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                 <h4 className="text-indigo-400 font-bold mb-4">The "Zero-Tap" Presence</h4>
                 <p className="text-slate-500 text-sm leading-relaxed">Teacher selects class → System initiates low-latency camera stream → Model detects faces in real-time → UI highlights matched students → One-click verification & sync.</p>
              </div>
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                 <h4 className="text-purple-400 font-bold mb-4">Administrative Oversight</h4>
                 <p className="text-slate-500 text-sm leading-relaxed">Admin reviews dashboard → Drills down into underperforming classes → Identifies student trends → Exports automated compliance reports.</p>
              </div>
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-10 border-t border-slate-800 text-center pb-20">
        <p className="text-slate-600 text-sm italic">"Automating precision, Empowering education."</p>
        <p className="text-slate-500 text-[10px] mt-4 font-mono tracking-widest uppercase">Smart Presence v1.0.4 Rev-A</p>
      </div>
    </div>
  );
};

export default Documentation;
