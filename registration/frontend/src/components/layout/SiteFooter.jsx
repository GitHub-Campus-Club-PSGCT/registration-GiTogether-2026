import githubMark from '@/assets/github-mark.svg';
import { CLUB_NAME, SITE_YEAR } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="relative z-10 flex items-center justify-center gap-2 px-4 pb-8 pt-4 text-xs text-graphite-400 sm:px-10">
      <p>
        &copy; {SITE_YEAR} {CLUB_NAME}. All rights reserved.
      </p>
      <img src={githubMark} alt="GitHub" className="h-4 w-4" />
    </footer>
  );
}
