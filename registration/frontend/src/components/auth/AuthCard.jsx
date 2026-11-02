export default function AuthCard({ children }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-brand-600/70 via-graphite-500/30 to-transparent" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[27px] border border-white/[0.08] bg-gradient-to-b from-graphite-800/95 via-graphite-900/95 to-graphite-950/98 p-6 shadow-2xl backdrop-blur-xl animate-glow-pulse sm:p-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-600 to-transparent" aria-hidden="true" />
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
