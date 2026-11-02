import { Loader2 } from 'lucide-react';

export default function SubmitButton({ loading = false, disabled, children, className = '', ...buttonProps }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-brand-500 to-brand-700 px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_-10px_rgba(225,6,0,0.8),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_rgba(225,6,0,0.95),inset_0_1px_0_rgba(255,255,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-950 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 ${className}`}
      {...buttonProps}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      <span className="relative">{children}</span>
    </button>
  );
}
