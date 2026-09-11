import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DistributionItem {
  label: string;
  count: number;
  color?: string;
}

interface AnalyticsDistributionChartProps {
  title: string;
  icon: LucideIcon;
  items: DistributionItem[];
  totalCount: number;
  colorTheme?: string;
}

export const AnalyticsDistributionChart: React.FC<AnalyticsDistributionChartProps> = ({
  title,
  icon: Icon,
  items,
  totalCount,
  colorTheme = 'bg-teal-500'
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Icon className="w-4 h-4 text-teal-400" /> {title}
      </h3>

      {items.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-4 text-center">No breakdown data available</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const total = totalCount > 0 ? totalCount : 1;
            const pct = Math.round((item.count / total) * 100);
            const barColor = item.color || colorTheme;

            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="font-mono">{item.label}</span>
                  <span className="font-bold text-slate-400">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`${barColor} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
