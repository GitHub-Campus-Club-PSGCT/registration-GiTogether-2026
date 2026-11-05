import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { setMemberAttendance } from '@/lib/authService';

const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// Only changes once the server confirms, so a tick always means the mark was saved.
export default function AttendanceButton({ teamCode, member, onTeamChange, onSessionExpired, large = false }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const present = Boolean(member.checkedInAt);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      const { team } = await setMemberAttendance(teamCode, member.rollNumber, !present);
      onTeamChange(team);
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired();
      else setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={present}
        aria-label={present ? `${member.name} is present. Undo.` : `Mark ${member.name} present`}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-[0.98] disabled:opacity-70 ${large ? 'h-14 text-base' : 'h-11 text-sm'} ${present ? 'border-success-500/40 bg-success-500/10 text-success-300 hover:border-success-400' : 'border-graphite-500 text-white hover:border-graphite-300'}`}
      >
        <span className="flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : present && <Check className="h-4 w-4" aria-hidden="true" />}
          {present ? `Present · ${formatTime(member.checkedInAt)}` : 'Mark present'}
        </span>
        {present && <span className="text-xs font-normal text-graphite-300">Undo</span>}
      </button>
      {error && <p role="alert" className="mt-1.5 text-xs text-error-300">{error}</p>}
    </div>
  );
}
