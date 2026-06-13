import { ReactNode } from 'react';

interface PanelProps { title?: string; children: ReactNode; headerAction?: ReactNode; className?: string; }

export function Panel({ title, children, headerAction, className }: PanelProps) {
  return (
    <div className={`glass-card p-5 space-y-4 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-navy-400 text-xs font-semibold uppercase tracking-wider">{title}</h3>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}
