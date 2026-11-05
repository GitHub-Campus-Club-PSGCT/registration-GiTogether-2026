import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react';
import { Check, Download, Layers, LogOut, MailWarning, RefreshCw, ScanLine, Search, SquareCheck, UserCheck, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import AttendanceSheet from '@/components/admin/AttendanceSheet';
import FormBanner from '@/components/ui/FormBanner';
import { countPresent, formatTime, teamMatches } from '@/lib/attendance';
import { ATTENDANCE_CSV_URL } from '@/lib/authService';
import { SPRING, cardVariants, riseVariants } from '@/lib/motion';
import { getStudentYear } from '@/lib/validation';

const CheckInScanner = lazy(() => import('@/components/admin/CheckInScanner'));

const YEARS = {
  first: { label: '1st Year', hint: "Batch '26", bar: 'bg-brand-500', badge: 'border-brand-500/40 bg-brand-500/10 text-brand-300' },
  second: { label: '2nd Year', hint: "Batch '25 + lateral", bar: 'bg-white', badge: 'border-white/25 bg-white/10 text-white' },
  other: { label: 'Check these', hint: 'Roll number not in range', bar: 'bg-warning-400', badge: 'border-warning-400/40 bg-warning-400/10 text-warning-300' },
};

const FILTERS = ['all', 'first', 'second', 'other'];

const ARRIVALS = {
  full: { label: 'All here', hint: 'Whole team', bar: 'bg-success-500' },
  partial: { label: 'Partly here', hint: 'Someone still to come', bar: 'bg-warning-400' },
  none: { label: 'Not arrived', hint: 'Nobody yet', bar: 'bg-graphite-400' },
};

const arrivalOf = (team) => {
  const present = countPresent(team);
  if (present === 0) return 'none';
  return present === team.members.length ? 'full' : 'partial';
};

const CARD_CLASSES = 'rounded-2xl border border-white/[0.08] bg-graphite-900/90';

const buttonClasses = (extra = '') =>
  `inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-[0.97] ${extra}`;

const formatDate = (date) => new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function StatCard({ label, value, detail, icon, accent = 'text-white' }) {
  return (
    <motion.div variants={riseVariants} className={`${CARD_CLASSES} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-graphite-300">{label}</p>
        <span className="text-graphite-300" aria-hidden="true">{icon}</span>
      </div>
      <p className={`mt-3 font-display text-3xl font-bold leading-none sm:text-4xl ${accent}`}>{value}</p>
      <p className="mt-2 text-sm text-graphite-300">{detail}</p>
    </motion.div>
  );
}

function FilterCard({ label, hint, bar, count, note, total, active, onClick }) {
  const share = total ? count / total : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border bg-graphite-950/60 p-4 text-left transition duration-150 hover:border-graphite-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-[0.98] ${active ? 'border-brand-500' : 'border-white/[0.08]'}`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-lg font-bold text-white">{label}</span>
        <span className="text-xs text-graphite-300">{hint}</span>
      </span>
      <span className="mt-2 block font-display text-3xl font-bold leading-none text-white">
        {count} <span className="text-base font-normal text-graphite-300">({Math.round(share * 100)}%)</span>
      </span>
      <span className="mt-1 block h-5 text-xs text-graphite-300">{note}</span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-graphite-700">
        <motion.span className={`block h-full origin-left rounded-full ${bar}`} initial={{ scaleX: 0 }} animate={{ scaleX: share }} transition={SPRING} />
      </span>
    </button>
  );
}

function MemberRow({ member }) {
  const { year, lateral } = getStudentYear(member.rollNumber);
  return (
    <li className="rounded-xl border border-white/[0.06] bg-graphite-950/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words font-medium text-white">
          {member.name}{' '}
          {member.isLeader && <span className="ml-1 rounded bg-brand-600 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.1em] text-white">Leader</span>}
        </p>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${YEARS[year].badge}`}>
          {year === 'other' ? 'Check' : YEARS[year].label}
          {lateral && ' · Lateral'}
        </span>
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-sm text-graphite-300">
        <span>{member.rollNumber}</span>
        <a href={`tel:${member.phone}`} className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">{member.phone}</a>
      </p>
      <p className={`mt-1.5 flex items-center gap-1.5 text-sm ${member.checkedInAt ? 'text-success-300' : 'text-graphite-400'}`}>
        {member.checkedInAt && <Check className="h-4 w-4" aria-hidden="true" />}
        {member.checkedInAt ? `Here since ${formatTime(member.checkedInAt)}` : 'Not here yet'}
      </p>
    </li>
  );
}

function TeamCard({ team, onMark }) {
  const allHere = countPresent(team) === team.members.length;
  return (
    <article className={`${CARD_CLASSES} p-5`}>
      <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="min-w-0">
          <h3 className="break-words font-display text-xl font-bold leading-tight text-white">{team.teamName}</h3>
          <p className="mt-1 text-xs text-graphite-300">{team.teamCode} · {formatDate(team.createdAt)}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${allHere ? 'border-success-500/40 text-success-300' : 'border-white/[0.12] text-graphite-200'}`}>{countPresent(team)} of {team.members.length} here</span>
      </header>
      <ul className="mt-3 space-y-2">
        {team.members.map((member) => <MemberRow key={member.rollNumber} member={member} />)}
      </ul>
      <button type="button" onClick={() => onMark(team)} className={buttonClasses('mt-3 w-full border-graphite-500 text-white hover:border-graphite-300')}>
        <SquareCheck className="h-4 w-4" aria-hidden="true" />
        Mark attendance
      </button>
      {team.emailStatus === 'failed' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-warning-300">
          <MailWarning className="h-3.5 w-3.5" aria-hidden="true" />
          Pass email failed for {team.members.find((member) => member.isLeader)?.email}
        </p>
      )}
    </article>
  );
}

export default function AdminDashboard({ teams, loadError, refreshing, onRefresh, onLogout, onTeamChange }) {
  const [filter, setFilter] = useState('all');
  const [arrival, setArrival] = useState(null);
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [markingTeam, setMarkingTeam] = useState(null);
  const searchRef = useRef(null);

  const closeScanner = useCallback(() => setScanning(false), []);

  const stats = useMemo(() => {
    const people = teams.flatMap((team) => team.members);
    const years = { first: 0, second: 0, other: 0 };
    let lateral = 0;
    for (const member of people) {
      const result = getStudentYear(member.rollNumber);
      years[result.year] += 1;
      if (result.lateral) lateral += 1;
    }
    return {
      people: people.length,
      present: people.filter((member) => member.checkedInAt).length,
      arrivals: Object.fromEntries(Object.keys(ARRIVALS).map((key) => [key, teams.filter((team) => arrivalOf(team) === key).length])),
      years,
      lateral,
      average: teams.length ? (people.length / teams.length).toFixed(1) : '0',
      failedEmails: teams.filter((team) => team.emailStatus === 'failed').length,
    };
  }, [teams]);

  const teamCounts = useMemo(
    () => Object.fromEntries(FILTERS.map((year) => [year, year === 'all' ? teams.length : teams.filter((team) => team.members.some((member) => getStudentYear(member.rollNumber).year === year)).length])),
    [teams],
  );

  const visibleTeams = useMemo(() => {
    const search = query.trim().toLowerCase();
    return teams.filter((team) => {
      const inYear = filter === 'all' || team.members.some((member) => getStudentYear(member.rollNumber).year === filter);
      const inSearch = !search || teamMatches(team, search);
      const inArrival = !arrival || arrivalOf(team) === arrival;
      return inYear && inSearch && inArrival;
    });
  }, [teams, filter, arrival, query]);

  const toggleYear = (year) => setFilter((current) => (current === year ? 'all' : year));

  return (
    <motion.main variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.header variants={riseVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-[0.01em] text-white sm:text-5xl">Dashboard</h1>
          <p className="mt-2 font-display text-base text-graphite-300">GiTogether 2026 registrations. Updates by itself every 30 seconds.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setScanning(true)} className={buttonClasses('border-brand-600 bg-brand-600 text-white hover:border-brand-500 hover:bg-brand-500')}>
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Scan pass
          </button>
          <button type="button" onClick={() => searchRef.current?.focus()} className={buttonClasses('border-graphite-600 text-graphite-100 hover:border-graphite-400 hover:text-white')}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Find team
          </button>
          <button type="button" onClick={onRefresh} disabled={refreshing} className={buttonClasses('border-graphite-600 text-graphite-100 hover:border-graphite-400 hover:text-white disabled:opacity-70')}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={onLogout} className={buttonClasses('border-brand-600/70 text-brand-300 hover:bg-brand-600 hover:text-white')}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </motion.header>

      {loadError && (
        <div className="mt-6">
          <FormBanner message={loadError} />
        </div>
      )}

      <section aria-label="Totals" className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Teams" value={teams.length} detail="Registered so far" icon={<Layers className="h-5 w-5" />} accent="text-brand-400" />
        <StatCard label="People" value={stats.people} detail="Across all teams" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Average team" value={stats.average} detail="Members per team" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard
          label="Failed emails"
          value={stats.failedEmails}
          detail={stats.failedEmails ? 'Marked on their team cards' : 'All clear so far'}
          icon={<MailWarning className="h-5 w-5" />}
          accent={stats.failedEmails ? 'text-warning-400' : 'text-white'}
        />
      </section>

      <motion.section variants={riseVariants} aria-labelledby="attendance" className={`${CARD_CLASSES} mt-4 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="attendance" className="font-display text-xl font-bold text-white">Attendance</h2>
            <p className="text-sm text-graphite-300">{stats.present} of {stats.people} people here. Pick a card to filter the teams below</p>
          </div>
          <a href={ATTENDANCE_CSV_URL} download className={buttonClasses('border-graphite-600 text-graphite-100 hover:border-graphite-400 hover:text-white')}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download CSV
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(ARRIVALS).map(([key, details]) => (
            <FilterCard
              key={key}
              {...details}
              count={stats.arrivals[key]}
              total={teams.length}
              active={arrival === key}
              onClick={() => setArrival((current) => (current === key ? null : key))}
            />
          ))}
        </div>
      </motion.section>

      <motion.section variants={riseVariants} aria-labelledby="year-split" className={`${CARD_CLASSES} mt-4 p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="year-split" className="font-display text-xl font-bold text-white">People by year</h2>
          <p className="text-sm text-graphite-300">Pick a year to filter the teams below</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {['first', 'second', 'other'].map((year) => (
            <FilterCard
              key={year}
              label={YEARS[year].label}
              hint={YEARS[year].hint}
              bar={YEARS[year].bar}
              count={stats.years[year]}
              note={year === 'second' && stats.lateral > 0 ? `Including ${stats.lateral} lateral` : null}
              total={stats.people}
              active={filter === year}
              onClick={() => toggleYear(year)}
            />
          ))}
        </div>
      </motion.section>

      <motion.section variants={riseVariants} aria-label="Teams" className="mt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="group relative block lg:w-96">
            <span className="sr-only">Search teams</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-graphite-400 transition-colors duration-150 group-focus-within:text-brand-500" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Team, name, roll number or phone"
              className="h-11 w-full rounded-xl border border-graphite-600/80 bg-graphite-900/90 pl-11 pr-4 text-base text-graphite-50 transition duration-150 placeholder:text-graphite-400 focus:border-brand-600 focus:outline-none sm:text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by year">
            {FILTERS.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setFilter(year)}
                aria-pressed={filter === year}
                className={`h-9 rounded-full border px-3.5 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-[0.97] ${filter === year ? 'border-brand-600 bg-brand-600 text-white' : 'border-white/[0.12] text-graphite-200 hover:border-graphite-400'}`}
              >
                {year === 'all' ? 'All' : YEARS[year].label} ({teamCounts[year]})
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-graphite-300" aria-live="polite">Showing {visibleTeams.length} of {teams.length} teams</p>

        {visibleTeams.length > 0 ? (
          <div className="mt-3 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTeams.map((team) => <TeamCard key={team.teamCode} team={team} onMark={setMarkingTeam} />)}
          </div>
        ) : (
          <p className={`${CARD_CLASSES} mt-3 p-8 text-center text-graphite-300`}>{teams.length ? 'No teams match that.' : 'No teams yet.'}</p>
        )}
      </motion.section>

      <AnimatePresence>
        {scanning && (
          <Suspense key="scanner" fallback={null}>
            <CheckInScanner teams={teams} onClose={closeScanner} onTeamChange={onTeamChange} onSessionExpired={onRefresh} />
          </Suspense>
        )}
        {markingTeam && (
          <AttendanceSheet
            key={markingTeam.teamCode}
            team={markingTeam}
            refreshOnOpen
            onClose={() => setMarkingTeam(null)}
            onSaved={(team) => {
              onTeamChange(team);
              setMarkingTeam(null);
            }}
            onSessionExpired={onRefresh}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}
