import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CameraOff, Loader2, ScanLine, X } from 'lucide-react';
import QrScanner from 'qr-scanner';
import AttendanceButton from '@/components/admin/AttendanceButton';
import { getAdminTeam } from '@/lib/authService';

const TEAM_CODE_PATTERN = /^GT-[A-Z0-9]{6}$/;
const SCANS_PER_SECOND = 8;
const SCAN_VIBRATION_MS = 60;
const PASS_GONE_MS = 1500;

function CameraView({ previousCode, onTeamFound, onSessionExpired }) {
  const videoRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let busy = false;
    let closed = false;
    // The camera keeps seeing the same QR, so a bad one is only reported once.
    let ignoredCode = null;
    let previousSeenAt = Date.now();

    const handleScan = async ({ data }) => {
      const code = data.trim().toUpperCase();

      // The last pass is often still in view after "Scan next team", so it only counts once it has left the frame.
      if (code === previousCode && Date.now() - previousSeenAt < PASS_GONE_MS) {
        previousSeenAt = Date.now();
        return;
      }
      if (busy || code === ignoredCode) return;

      if (!TEAM_CODE_PATTERN.test(code)) {
        ignoredCode = code;
        setProblem('That QR isn\'t a GiTogether pass.');
        return;
      }

      busy = true;
      setProblem(null);
      setSearching(true);
      try {
        const { team } = await getAdminTeam(code);
        if (!closed) onTeamFound(team);
      } catch (error) {
        if (error.status === 401) {
          onSessionExpired();
        } else {
          if (error.status === 404) ignoredCode = code;
          setProblem(error.message);
        }
      } finally {
        busy = false;
        setSearching(false);
      }
    };

    const scanner = new QrScanner(videoRef.current, handleScan, {
      returnDetailedScanResult: true,
      preferredCamera: 'environment',
      maxScansPerSecond: SCANS_PER_SECOND,
    });
    scanner.start().catch(() => {
      if (!closed) setCameraFailed(true);
    });

    return () => {
      closed = true;
      scanner.destroy();
    };
  }, [previousCode, onTeamFound, onSessionExpired]);

  if (cameraFailed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <CameraOff className="h-8 w-8 text-graphite-300" aria-hidden="true" />
        <p className="max-w-xs text-graphite-200">Couldn't open the camera. Allow camera access, or close this and search for the team instead.</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="aspect-square w-2/3 max-w-sm rounded-2xl border-2 border-white shadow-[0_0_0_100vmax_rgba(10,11,13,0.55)]" />
      </div>
      <p role="status" className={`absolute inset-x-4 bottom-6 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-medium ${problem ? 'bg-brand-700 text-white' : 'bg-graphite-950/90 text-graphite-100'}`}>
        {searching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {searching ? 'Finding the team' : (problem ?? 'Point the camera at the QR on the pass')}
      </p>
    </div>
  );
}

function ScannedTeam({ team, onTeamChange, onScanNext, onSessionExpired }) {
  const presentCount = team.members.filter((member) => member.checkedInAt).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-graphite-300">{team.teamCode}</p>
          <h3 className="mt-1 break-words font-display text-3xl font-bold leading-tight text-white">{team.teamName}</h3>
          <p role="status" className="mt-2 text-sm text-graphite-200">{presentCount} of {team.members.length} present</p>
          <ul className="mt-5 space-y-3">
            {team.members.map((member) => (
              <li key={member.rollNumber} className="rounded-xl border border-white/[0.08] bg-graphite-900/90 p-4">
                <p className="break-words text-lg font-medium text-white">
                  {member.name}{' '}
                  {member.isLeader && <span className="ml-1 rounded bg-brand-600 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.1em] text-white">Leader</span>}
                </p>
                <p className="mb-3 mt-1 text-sm text-graphite-300">{member.rollNumber}</p>
                <AttendanceButton teamCode={team.teamCode} member={member} onTeamChange={onTeamChange} onSessionExpired={onSessionExpired} large />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.08] p-4">
        <button
          type="button"
          onClick={onScanNext}
          className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-brand-600 font-medium text-white transition duration-150 hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
        >
          <ScanLine className="h-5 w-5" aria-hidden="true" />
          Scan next team
        </button>
      </div>
    </div>
  );
}

// Loaded only when opened, so the rest of the site doesn't carry the scanner.
export default function CheckInScanner({ onClose, onTeamChange, onSessionExpired }) {
  const [team, setTeam] = useState(null);
  const [previousCode, setPreviousCode] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const pageOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = pageOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const updateTeam = useCallback((updated) => {
    setTeam(updated);
    onTeamChange(updated);
  }, [onTeamChange]);

  const handleTeamFound = useCallback((found) => {
    navigator.vibrate?.(SCAN_VIBRATION_MS);
    updateTeam(found);
  }, [updateTeam]);

  const scanNext = () => {
    setPreviousCode(team.teamCode);
    setTeam(null);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="check-in-title" className="fixed inset-0 z-50 flex flex-col bg-graphite-950">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <h2 id="check-in-title" className="font-display text-xl font-bold text-white">{team ? 'Mark who\'s here' : 'Scan pass'}</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-graphite-200 transition duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      {team ? (
        <ScannedTeam team={team} onTeamChange={updateTeam} onScanNext={scanNext} onSessionExpired={onSessionExpired} />
      ) : (
        <CameraView previousCode={previousCode} onTeamFound={handleTeamFound} onSessionExpired={onSessionExpired} />
      )}
    </div>,
    document.body,
  );
}
