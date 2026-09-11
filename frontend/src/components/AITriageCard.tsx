import React, { useState } from 'react';
import { Bot, AlertTriangle, ShieldCheck, Sparkles, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';

export interface AITriageRecordProps {
  id?: string;
  recommended_category: string;
  recommended_priority: string;
  confidence_score: number;
  sdg_mapping: string;
  reasoning: string;
  suggested_action: string;
  prompt_version?: string;
  primary_model?: string;
  model_used?: string;
  fallback_used?: boolean;
  retry_count?: number;
  failure_reason?: string | null;
  is_fallback?: boolean;
}

interface AITriageCardProps {
  analysis?: AITriageRecordProps | null;
  studentPriority: string;
  aiPriority?: string;
  finalAdminPriority?: string;
  currentCategory: string;
  onOverridePriority?: (newPriority: string, newCategory: string, notes: string) => Promise<void>;
  isReadOnly?: boolean;
}

export const AITriageCard: React.FC<AITriageCardProps> = ({
  analysis,
  studentPriority,
  aiPriority,
  finalAdminPriority,
  currentCategory,
  onOverridePriority,
  isReadOnly = false
}) => {
  const [selectedPriority, setSelectedPriority] = useState<string>(finalAdminPriority || aiPriority || studentPriority || 'MEDIUM');
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory || 'OTHER');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showOverrideForm, setShowOverrideForm] = useState<boolean>(false);

  const confidencePct = Math.round((analysis?.confidence_score ?? 0.5) * 100);

  const getPriorityColor = (prio: string) => {
    switch (prio.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const handleApplyOverride = async () => {
    if (!onOverridePriority) return;
    try {
      setIsSubmitting(true);
      await onOverridePriority(selectedPriority, selectedCategory, notes);
      setShowOverrideForm(false);
    } catch (err) {
      console.error('Failed to override AI triage:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header & Model Telemetry Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              Gemini AI Triage
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Decision Support
              </span>
            </h3>
            <p className="text-xs text-slate-400">Model telemetry & SDG impact assessment</p>
          </div>
        </div>

        {/* Telemetry Badge */}
        <div className="text-right">
          {analysis?.is_fallback ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" /> Rule-Based Fallback
            </span>
          ) : analysis?.fallback_used ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <RefreshCw className="w-3 h-3 animate-spin-slow" /> {analysis.model_used} (Fallback Model)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3 h-3 text-emerald-400" /> {analysis?.model_used || 'gemini-2.5-flash'}
            </span>
          )}
        </div>
      </div>

      {/* Confidence Score & SDG Tag */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Confidence Meter */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
            <span>AI Confidence Score</span>
            <span className="font-mono font-semibold text-slate-200">{confidencePct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                confidencePct >= 80 ? 'bg-emerald-500' : confidencePct >= 60 ? 'bg-yellow-500' : 'bg-amber-500'
              }`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {/* SDG Impact Badge */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-center">
          <span className="text-xs text-slate-400 mb-1">UN SDG Alignment</span>
          <span className="text-xs font-medium text-emerald-300 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {analysis?.sdg_mapping || 'SDG 11: Sustainable Cities and Communities'}
          </span>
        </div>
      </div>

      {/* Priority Comparison Grid */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Priority Comparison Matrix</h4>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-md">
            <span className="block text-[11px] text-slate-400 mb-1">Student Priority</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getPriorityColor(studentPriority)}`}>
              {studentPriority}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-md">
            <span className="block text-[11px] text-slate-400 mb-1">AI Recommended</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getPriorityColor(analysis?.recommended_priority || aiPriority || 'MEDIUM')}`}>
              {analysis?.recommended_priority || aiPriority || 'MEDIUM'}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-md">
            <span className="block text-[11px] text-slate-400 mb-1">Final Admin Priority</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getPriorityColor(finalAdminPriority || analysis?.recommended_priority || 'MEDIUM')}`}>
              {finalAdminPriority || analysis?.recommended_priority || 'UNSET'}
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning & Suggested Action */}
      {analysis?.reasoning && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg">
            <span className="font-semibold text-slate-300 block mb-1">Factual Reasoning:</span>
            <p className="text-slate-400 leading-relaxed">{analysis.reasoning}</p>
          </div>
          {analysis.suggested_action && (
            <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg text-emerald-300">
              <span className="font-semibold block mb-1 text-emerald-400">Recommended Action:</span>
              <p className="leading-relaxed text-emerald-300/90">{analysis.suggested_action}</p>
            </div>
          )}
        </div>
      )}

      {/* Admin Override Action Bar */}
      {!isReadOnly && onOverridePriority && (
        <div className="border-t border-slate-800 pt-3">
          {!showOverrideForm ? (
            <div className="flex items-center justify-between">
              <button
                onClick={async () => {
                  if (onOverridePriority) {
                    await onOverridePriority(analysis?.recommended_priority || 'MEDIUM', currentCategory, 'Accepted AI priority recommendation');
                  }
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept AI Recommendation
              </button>
              <button
                onClick={() => setShowOverrideForm(true)}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                Override Priority / Category <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg space-y-3">
              <h5 className="text-xs font-semibold text-slate-200">Admin Priority & Category Override</h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Set Final Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Set Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
                  >
                    <option value="WASTE">WASTE</option>
                    <option value="WATER">WATER</option>
                    <option value="ENERGY">ENERGY</option>
                    <option value="CLEANLINESS">CLEANLINESS</option>
                    <option value="FOOD">FOOD</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Admin Audit Rationale (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Ground inspection confirmed severe safety hazard"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setShowOverrideForm(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyOverride}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1"
                >
                  {isSubmitting ? 'Saving...' : 'Save Admin Override'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
