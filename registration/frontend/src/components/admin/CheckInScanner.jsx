import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CameraOff, Check, Loader2, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import QrScanner from 'qr-scanner';
import AttendanceSheet from '@/components/admin/AttendanceSheet';
import BottomSheet, { useCoverPage } from '@/components/admin/BottomSheet';
import { countPresent, teamMatches } from '@/lib/attendance';
import { getAdminTeam } from '@/lib/authService';
import { SPRING_QUICK, SPRING_SHEET } from '@/lib/motion';

const TEAM_CODE_PATTERN = /^GT-[A-Z0-9]{6}$/;
const SCANS_PER_SECOND = 8;
const SCAN_VIBRATION_MS = 15;
const PASS_GONE_MS = 1500;
const PROBLEM_SHOWN_MS = 4000;

const FRAME_CORNERS = ['left-0 top-0 rounded-tl-3xl border-l-4 border-t-4', 'right-0 top-0 rounded-tr-3xl border-r-4 border-t-4', 'bottom-0 left-0 rounded-bl-3xl border-b-4 border-l-4', 'bottom-0 right-0 rounded-br-3xl border-b-4 border-r-4'];

function ScanFrame({ found }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <motion.div
        animate={{ scale: found ? 0.94 : 1 }}
        transition={SPRING_QUICK}
        className="relative aspect-square w-[70%] max-w-sm rounded-3xl shadow-[0_0_0_100vmax_rgba(10,11,13,0.5)]"
      >
        {FRAME_CORNERS.map((corner) => (
          <span key={corner} className={`absolute h-11 w-11 transition-colors duration-100 ${corner} ${found ? 'border-success-400' : 'border-white'}`} />
        ))}
      </motion.div>
    </div>
  );
}

function FindTeamSheet({ teams, onPick, onClose }) {
  const titleId = useId();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? teams.filter((team) => teamMatches(team, search)) : teams;
  }, [teams, query]);

  return (
    <BottomSheet
      labelledBy={titleId}
      onDismiss={onClose}
      className="h-[85dvh]"
      header={(
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-2">
          <h2 id={titleId} className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-white">Find team</h2>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Close"
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-graphite-100 transition-colors duration-100 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    >
      <div className="shrink-0 px-5 pb-3">
        <label className="relative block">
          <span className="sr-only">Search teams</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-graphite-300" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Team, code, name or roll number"
            className="h-12 w-full rounded-2xl border border-white/[0.1] bg-white/[0.06] pl-11 pr-4 text-base text-white placeholder:text-graphite-300 focus:border-white/30 focus:outline-none"
          />
        </label>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-5">
        {matches.map((team) => {
          const present = countPresent(team);
          const allHere = present === team.members.length;
          return (
            <li key={team.teamCode}>
              <motion.button
                type="button"
                onClick={() => onPick(team)}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_QUICK}
                className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="min-w-0">
                  <span className="block break-words text-[17px] font-medium leading-snug text-white">{team.teamName}</span>
                  <span className="block text-sm text-graphite-300">{team.teamCode}</span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-sm ${allHere ? 'text-success-300' : 'text-graphite-200'}`}>
                  {allHere && <Check className="h-4 w-4" aria-hidden="true" />}
                  {present} of {team.members.length}
                </span>
              </motion.button>
            </li>
          );
        })}
        {matches.length === 0 && <li className="py-8 text-center text-graphite-300">No teams match that.</li>}
      </ul>
    </BottomSheet>
  );
}

function StatusPill({ tone = 'plain', children }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_QUICK}
      className={`flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-center text-[15px] font-medium ${tone === 'problem' ? 'bg-brand-700 text-white' : 'chrome-material text-white'}`}
    >
      {children}
    </motion.div>
  );
}

// The camera stays live behind the marking sheet, so it's ready the moment a team is saved.
export default function CheckInScanner({ teams, onClose, onTeamChange, onSessionExpired }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const [sheet, setSheet] = useState(null);
  const [camera, setCamera] = useState('starting');
  const [finding, setFinding] = useState(false);
  const [problem, setProblem] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const scan = useRef({ paused: false, busy: false, ignoredCode: null, previousCode: null, previousSeenAt: 0 }).current;

  useCoverPage();

  const openSheet = (next) => {
    scan.paused = true;
    setSheet(next);
  };

  const closeSheet = () => {
    scan.paused = false;
    scan.previousSeenAt = Date.now();
    setSheet(null);
  };

  const handleCode = async (text) => {
    const code = text.trim().toUpperCase();

    // The last pass is often still in view after saving, so it only counts once it has left the frame.
    if (code === scan.previousCode && (scan.paused || Date.now() - scan.previousSeenAt < PASS_GONE_MS)) {
      scan.previousSeenAt = Date.now();
      return;
    }
    if (scan.paused || scan.busy || code === scan.ignoredCode) return;

    if (!TEAM_CODE_PATTERN.test(code)) {
      scan.ignoredCode = code;
      setProblem('That QR isn\'t a GiTogether pass.');
      return;
    }

    scan.busy = true;
    setProblem(null);
    setLastSaved(null);
    setFinding(true);
    navigator.vibrate?.(SCAN_VIBRATION_MS);
    try {
      const { team } = await getAdminTeam(code);
      scan.previousCode = code;
      onTeamChange(team);
      openSheet({ kind: 'team', team });
    } catch (error) {
      if (error.status === 401) {
        onSessionExpired();
      } else {
        if (error.status === 404) scan.ignoredCode = code;
        setProblem(error.message);
      }
    } finally {
      scan.busy = false;
      setFinding(false);
    }
  };

  const handleCodeRef = useRef(handleCode);
  handleCodeRef.current = handleCode;

  useEffect(() => {
    let closed = false;
    let scanner = null;
    // React's dev mode mounts this twice. Waiting a tick means only the second one opens the camera, because two scanners would stop each other's stream.
    const startTimer = setTimeout(() => {
      scanner = new QrScanner(videoRef.current, ({ data }) => handleCodeRef.current(data), {
        returnDetailedScanResult: true,
        preferredCamera: 'environment',
        maxScansPerSecond: SCANS_PER_SECOND,
      });
      scanner.start().then(
        () => !closed && setCamera('ready'),
        () => !closed && setCamera('failed'),
      );
    }, 0);
    return () => {
      closed = true;
      clearTimeout(startTimer);
      scanner?.destroy();
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (sheet) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sheet, onClose]);

  useEffect(() => {
    if (!problem) return undefined;
    const timer = setTimeout(() => setProblem(null), PROBLEM_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [problem]);

  const handleSaved = (team) => {
    onTeamChange(team);
    setLastSaved(team);
    closeSheet();
  };

  const people = teams.flatMap((team) => team.members);
  const presentPeople = people.filter((member) => member.checkedInAt).length;

  const findTeamButton = (primary) => (
    <motion.button
      type="button"
      onClick={() => openSheet({ kind: 'find' })}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_QUICK}
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${primary ? 'bg-brand-600 text-white' : 'chrome-material text-white'}`}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      {primary ? 'Find team instead' : 'Can\'t scan? Find team'}
    </motion.button>
  );

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-in-title"
      inert={sheet ? '' : undefined}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={SPRING_SHEET}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
    >
      <video ref={videoRef} muted playsInline className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${camera === 'ready' ? 'opacity-100' : 'opacity-0'}`} />

      {camera === 'failed' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <CameraOff className="h-9 w-9 text-graphite-300" aria-hidden="true" />
          <p className="max-w-xs text-[17px] leading-snug text-graphite-100">Couldn't open the camera. Allow camera access in your browser's settings, or find the team instead.</p>
          {findTeamButton(true)}
        </div>
      ) : (
        <>
          <ScanFrame found={finding} />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 p-4 pb-6">
            {problem && <StatusPill key={problem} tone="problem">{problem}</StatusPill>}
            {!problem && finding && (
              <StatusPill key="finding">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Finding the team
              </StatusPill>
            )}
            {!problem && !finding && lastSaved && (
              <StatusPill key={lastSaved.updatedAt}>
                <Check className="h-4 w-4 shrink-0 text-success-400" aria-hidden="true" />
                <span className="min-w-0 truncate">{lastSaved.teamName} saved · {countPresent(lastSaved)} of {lastSaved.members.length} here</span>
                <button
                  type="button"
                  onClick={() => openSheet({ kind: 'team', team: lastSaved, refreshOnOpen: true })}
                  className="-my-1 ml-1 shrink-0 rounded-lg px-2 py-1.5 font-semibold text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Edit
                </button>
              </StatusPill>
            )}
            {!problem && !finding && !lastSaved && (
              <StatusPill key={camera}>{camera === 'ready' ? 'Point the camera at the QR on the pass' : 'Starting the camera'}</StatusPill>
            )}
            {findTeamButton(false)}
          </div>
        </>
      )}

      <header className="chrome-material absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 py-2.5">
        <div>
          <h2 id="check-in-title" className="font-display text-xl font-bold leading-tight tracking-[-0.01em] text-white">Scan pass</h2>
          <p className="text-sm text-graphite-200">{presentPeople} of {people.length} people here</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.1] text-white transition-colors duration-100 hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-white/25"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <AnimatePresence>
        {sheet?.kind === 'team' && (
          <AttendanceSheet
            key={sheet.team.teamCode}
            team={sheet.team}
            refreshOnOpen={sheet.refreshOnOpen}
            onClose={closeSheet}
            onSaved={handleSaved}
            onSessionExpired={onSessionExpired}
          />
        )}
        {sheet?.kind === 'find' && (
          <FindTeamSheet
            key="find"
            teams={teams}
            onPick={(team) => setSheet({ kind: 'team', team, refreshOnOpen: true })}
            onClose={closeSheet}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
