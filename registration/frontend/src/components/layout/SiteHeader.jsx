import Wordmark from '@/components/ui/Wordmark';

export default function SiteHeader() {
  return (
    <header className="relative z-10 flex h-20 items-center justify-between px-6 sm:px-10 animate-fade-in">
      <a href="/" aria-label="GiTogether26 home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
        <Wordmark />
      </a>
      <span className="hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-graphite-300 sm:flex">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-600" />
        Driver &amp; Entrant Portal
      </span>
    </header>
  );
}
