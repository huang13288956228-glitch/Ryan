export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return <span className={`${s} border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin`} />;
}
