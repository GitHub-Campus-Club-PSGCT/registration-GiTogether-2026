import { BASE_PATH } from '@shared/basePath.js';
import EventCountdown from '@/components/layout/EventCountdown';
import Wordmark from '@/components/ui/Wordmark';

export default function SiteHeader() {
  return (
    <header className="relative z-10 flex h-20 items-center justify-between gap-6 px-[41px] sm:px-10 animate-fade-in">
      <div className="w-full min-w-0 max-w-[314px] sm:max-w-[419px]">
        <a href={`${BASE_PATH}/registration`} aria-label="GiTogether26 home" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
          <Wordmark />
        </a>
        <EventCountdown />
      </div>
      <span className="hidden shrink-0 items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-graphite-300 sm:flex">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-600" />
        Driver &amp; Entrant Portal
      </span>
    </header>
  );
}
