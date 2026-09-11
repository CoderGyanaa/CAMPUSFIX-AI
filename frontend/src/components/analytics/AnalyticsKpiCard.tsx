import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnalyticsKpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  colorTheme?: 'purple' | 'teal' | 'emerald' | 'amber' | 'blue' | 'rose';
  trend?: string;
}

export const AnalyticsKpiCard: React.FC<AnalyticsKpiCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorTheme = 'teal',
  trend
}) => {
  const themeClasses = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2 relative overflow-hidden">
      <div className="flex justify-between items-center text-slate-400">
        <span className="text-xs font-medium">{title}</span>
        <div className={`p-2 rounded-lg border ${themeClasses[colorTheme]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="text-2xl font-bold text-white tracking-tight">
        {value}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          {subtext && <span>{subtext}</span>}
          {trend && <span className="text-teal-400 font-semibold">{trend}</span>}
        </div>
      )}
    </div>
  );
};
