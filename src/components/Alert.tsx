interface AlertProps { type?: 'error' | 'success' | 'warning' | 'info'; message: string; }

export function Alert({ type = 'error', message }: AlertProps) {
  const colors = { error: 'badge-red', success: 'badge-green', warning: 'badge-amber', info: 'badge-blue' };
  return <div className={`${colors[type]} px-4 py-3 rounded-lg text-sm`}>{message}</div>;
}
