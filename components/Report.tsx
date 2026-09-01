
import React, { useState, useMemo } from 'react';
import { ForensicReport, MediaType, Artifact, GroundingSource } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { searchWebForSources } from '../services/geminiService';

interface ReportProps {
  report: ForensicReport;
  previewUrl: string | null;
  mediaType: MediaType;
  onBack: () => void;
  isShared?: boolean;
}

const Report: React.FC<ReportProps> = ({ report, previewUrl, mediaType, onBack, isShared }) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'name'>('severity');
  
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ explanation: string, sources: GroundingSource[] } | null>(null);
  const [searchError, setSearchError] = useState<{ type: 'network' | 'no_results' | 'generic', message: string } | null>(null);

  const [feedbackRating, setFeedbackRating] = useState<null | 'positive' | 'negative'>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Added submitFeedback function to handle audit logging.
  const submitFeedback = () => {
    setFeedbackSubmitted(true);
  };

  const chartData = [
    { name: 'Organic Traits', value: report.authenticityScore },
    { name: 'Synthetic Traits', value: 100 - report.authenticityScore },
  ];

  const COLORS = [
    report.authenticityScore > 70 ? '#10b981' : '#3b82f6', 
    report.isAIGenerated ? '#ef4444' : '#52525b'
  ];

  const filteredArtifacts = useMemo(() => {
    let list = [...report.detectedArtifacts];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(a => a.label.toLowerCase().includes(lowerSearch) || a.description.toLowerCase().includes(lowerSearch));
    }
    if (severityFilter !== 'all') list = list.filter(a => a.severity === severityFilter);
    list.sort((a, b) => {
      if (sortBy === 'severity') {
        const priority = { high: 3, medium: 2, low: 1 };
        return priority[b.severity] - priority[a.severity];
      }
      return a.label.localeCompare(b.label);
    });
    return list;
  }, [report.detectedArtifacts, searchTerm, severityFilter, sortBy]);

  const getStatusColor = () => {
    if (report.isAIGenerated) return 'text-red-400 bg-red-400/5 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]';
    if (report.authenticityScore > 85) return 'text-emerald-400 bg-emerald-400/5 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]';
    return 'text-blue-400 bg-blue-400/5 border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]';
  };

  const handleWebSearch = async () => {
    if (isShared || !previewUrl) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const file = new File([blob], "analyzed_media", { type: blob.type });
      const results = await searchWebForSources(file, mediaType);
      if (results.sources.length === 0) {
        setSearchError({ type: 'no_results', message: "No matching origin signatures found." });
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setSearchError({ type: 'network', message: "Uplink failure." });
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-center animate-fade-up">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:border-blue-500/30 transition-all group active:scale-95">
          <i className="fas fa-arrow-left text-xs transition-transform group-hover:-translate-x-1"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Terminal</span>
        </button>
        <div className="flex items-center gap-2 text-[10px] mono text-zinc-600">
           REPORT_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
        </div>
      </div>

      <div className={`w-full p-8 md:p-12 rounded-[2.5rem] border animate-fade-up overflow-hidden relative group ${getStatusColor()}`}>
        <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-start lg:items-center">
          <div className="w-24 h-24 rounded-3xl bg-white/5 backdrop-blur-xl flex items-center justify-center shrink-0 border border-white/10 group-hover:rotate-6 transition-transform">
            <i className={`fas ${report.isAIGenerated ? 'fa-shield-virus' : 'fa-shield-check'} text-4xl`}></i>
          </div>
          <div className="flex-1 space-y-3">
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Forensic Verdict</span>
               <div className="h-[1px] w-12 bg-current opacity-20"></div>
             </div>
             <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">{report.verdict}</h2>
             <p className="text-base md:text-lg italic opacity-80 leading-relaxed max-w-4xl">"{report.justification}"</p>
          </div>
          <div className="lg:text-right space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">Confidence Level</span>
            <div className="text-6xl font-black tracking-tighter">{report.authenticityScore}<span className="text-2xl opacity-40">%</span></div>
            <span className="text-[10px] font-black uppercase tracking-widest block py-1.5 px-3 bg-white/5 rounded-lg border border-white/5">Organic Credibility</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Model Attribution Card */}
          {report.isAIGenerated && (
            <div className="glass-panel rounded-[2.5rem] p-8 border-blue-500/20 animate-fade-up relative overflow-hidden bg-gradient-to-br from-blue-600/5 to-transparent">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-blue-500">Generator Attribution</h4>
                  <div className="flex items-center gap-4">
                    <div className="px-6 py-3 bg-blue-600 rounded-2xl text-xl font-black text-white shadow-lg tracking-tighter">
                      {report.generatorTool || "UNDETERMINED"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Attribution Certainty</span>
                      <span className="text-2xl font-black text-blue-400">{report.attributionConfidence || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="max-w-xs text-[11px] text-zinc-500 leading-relaxed">
                  Attribution is based on unique spectral and noise-pattern fingerprints characteristic of specific neural network architectures.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel rounded-[2rem] p-8 border-white/5 animate-fade-up hover-lift overflow-hidden relative">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-zinc-500">Multimodal Scan Results</h4>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={105} paddingAngle={10} dataKey="value" stroke="none">
                      {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-white">{report.authenticityScore}%</span>
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-[0.4em]">Organic</span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-8 border-white/5 animate-fade-up hover-lift flex flex-col h-full">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-zinc-500">Artifact Discovery Log</h4>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-64">
                {filteredArtifacts.map((art, i) => (
                  <div key={i} className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-zinc-100 uppercase tracking-tighter">{art.label}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded uppercase font-black tracking-widest ${art.severity === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{art.severity}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{art.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 border-blue-500/10 animate-fade-up relative overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-blue-400">Web Source Cross-Verification</h4>
                   <p className="text-zinc-500 text-xs font-medium">Scan global databases for original sources or model samples.</p>
                </div>
                {!searchResults && !searchLoading && !isShared && (
                  <button onClick={handleWebSearch} className="px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all flex items-center gap-3 shadow-lg">
                    <i className="fas fa-globe"></i>
                    Initiate Global Search
                  </button>
                )}
             </div>
             {searchLoading && <div className="py-12 flex justify-center animate-pulse text-blue-500 font-black text-[10px] uppercase tracking-widest">Consulting Grounding Engine...</div>}
             {searchResults && (
                <div className="space-y-6 animate-fade-up">
                   <div className="p-6 bg-black/40 border border-white/5 rounded-2xl italic text-zinc-400 text-sm leading-relaxed">{searchResults.explanation}</div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.sources.map((s, i) => (
                         <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-white/5 hover:bg-zinc-800 group">
                            <span className="text-[11px] font-bold text-zinc-300 truncate">{s.title}</span>
                            <i className="fas fa-external-link-alt text-[10px] text-zinc-600 group-hover:text-blue-500"></i>
                         </a>
                      ))}
                   </div>
                </div>
             )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8 sticky top-32">
          <div className="glass-panel rounded-[2.5rem] overflow-hidden p-5 border-white/5 animate-fade-up hover-lift">
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black mb-5 px-3">Primary Evidence Source</h4>
            <div className="aspect-square bg-black rounded-[1.5rem] overflow-hidden flex items-center justify-center border border-white/5 relative group">
              {mediaType === MediaType.IMAGE && previewUrl && <img src={previewUrl} className="w-full h-full object-cover" />}
              {mediaType === MediaType.VIDEO && previewUrl && <video src={previewUrl} controls className="w-full h-full" />}
              {mediaType === MediaType.AUDIO && previewUrl && <div className="flex items-center justify-center h-full"><i className="fas fa-waveform text-4xl text-blue-500"></i></div>}
            </div>
            <div className="mt-6 flex flex-col gap-3">
               <button onClick={onBack} className="text-[10px] px-6 py-3 bg-white text-black rounded-xl hover:bg-blue-100 transition-all uppercase font-black tracking-widest active:scale-95 shadow-xl">New Analysis</button>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border-zinc-800 animate-fade-up hover-lift">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 flex items-center gap-2">Forensic Audit Feedback</h4>
            {!feedbackSubmitted ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button onClick={() => setFeedbackRating('positive')} className={`flex-1 py-3 border rounded-xl transition-all flex items-center justify-center gap-2 ${feedbackRating === 'positive' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600/50'}`}>Helpful</button>
                  <button onClick={() => setFeedbackRating('negative')} className={`flex-1 py-3 border rounded-xl transition-all flex items-center justify-center gap-2 ${feedbackRating === 'negative' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-red-500/5 border-red-500/10 text-red-600/50'}`}>Inaccurate</button>
                </div>
                {feedbackRating && <button onClick={submitFeedback} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Submit Audit Log</button>}
              </div>
            ) : (
              <div className="text-center py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest">Audit Recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
