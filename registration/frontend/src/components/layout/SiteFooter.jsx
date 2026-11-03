import githubMark from '@/assets/github-mark.svg';
import { CLUB_NAME, CLUB_URL, SITE_YEAR } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="relative z-10 flex justify-center px-4 pb-8 pt-4 text-xs text-graphite-400 sm:px-10">
      <a
        href={CLUB_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded transition-colors duration-150 hover:text-graphite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <span>
          &copy; {SITE_YEAR} {CLUB_NAME}. All rights reserved.
        </span>
        <img src={githubMark} alt="GitHub" className="h-4 w-4" />
      </a>
    </footer>
  );
}
