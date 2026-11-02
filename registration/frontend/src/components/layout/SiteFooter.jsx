import Wordmark from '@/components/ui/Wordmark';
import { SITE_NAME, SITE_YEAR } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="relative z-10 flex flex-col items-center gap-3 px-6 pb-8 pt-4 text-center text-xs text-graphite-400 sm:flex-row sm:justify-between sm:text-left">
      <Wordmark size="xs" />
      <p>
        &copy; {SITE_YEAR} {SITE_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
