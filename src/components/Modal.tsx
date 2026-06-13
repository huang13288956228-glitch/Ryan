import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps { isOpen: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode; wide?: boolean; }

export function Modal({ isOpen, title, onClose, children, actions, wide }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-navy-900 border border-navy-700/50 rounded-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800/60">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {actions && <div className="flex gap-3 px-6 py-4 border-t border-navy-800/60">{actions}</div>}
      </div>
    </div>
  );
}
