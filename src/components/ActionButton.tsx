interface ActionButtonProps { onClick: () => void; loading?: boolean; children: React.ReactNode; className?: string; disabled?: boolean; fullWidth?: boolean; }

export default function ActionButton({ onClick, loading, children, className, disabled, fullWidth }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`btn-primary flex items-center justify-center gap-2 ${fullWidth ? 'w-full' : ''} ${className || ''}`}>
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}
