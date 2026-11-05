import { useEffect, useId, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import BottomSheet from '@/components/admin/BottomSheet';
import { formatTime } from '@/lib/attendance';
import { getAdminTeam, saveAttendance } from '@/lib/authService';
import { SPRING_QUICK } from '@/lib/motion';

const SAVE_VIBRATION_MS = 15;

function TickBox({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors duration-100 peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-graphite-900 ${checked ? 'border-success-500 bg-success-500' : 'border-graphite-400 bg-transparent'}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="#0a0b0d"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={SPRING_QUICK}
        />
      </svg>
    </span>
  );
}

const describeMark = (checked, savedAt) => {
  if (checked && savedAt) return { text: `Here since ${formatTime(savedAt)}`, tone: 'text-success-300' };
  if (checked) return { text: 'Not saved yet', tone: 'text-success-300' };
  if (savedAt) return { text: 'Will be unmarked', tone: 'text-warning-300' };
  return null;
};

function MemberCheckbox({ member, checked, disabled, onToggle }) {
  const mark = describeMark(checked, member.checkedInAt);
  return (
    <motion.label
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={SPRING_QUICK}
      className={`flex min-h-[72px] cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3 transition-colors duration-100 ${checked ? 'border-success-500/30 bg-success-500/10' : 'border-white/[0.08] bg-white/[0.04]'}`}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="peer sr-only" />
      <TickBox checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[17px] font-medium leading-snug text-white">
          {member.name}
          {member.isLeader && <span className="ml-2 inline-block rounded bg-brand-600 px-1.5 py-0.5 align-[2px] text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-white">Leader</span>}
        </span>
        <span className="mt-0.5 block text-sm text-graphite-300">
          {member.rollNumber}
          {mark && <span className={mark.tone}> · {mark.text}</span>}
        </span>
      </span>
    </motion.label>
  );
}

const describeProgress = (ticked, total, unsaved) => {
  if (unsaved) return `${ticked} of ${total} here after saving`;
  if (ticked === 0) return 'Tick everyone who\'s here';
  if (ticked === total) return 'Everyone is marked as here';
  return `${ticked} of ${total} here so far`;
};

// The one place attendance gets marked. Ticks stay on this screen until Save, so nothing changes by accident.
export default function AttendanceSheet({ team: startingTeam, refreshOnOpen = false, onClose, onSaved, onSessionExpired }) {
  const titleId = useId();
  const [team, setTeam] = useState(startingTeam);
  const [changes, setChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useEffect(() => {
    if (!refreshOnOpen) return undefined;
    let closed = false;
    getAdminTeam(startingTeam.teamCode)
      .then(({ team: latest }) => {
        if (!closed) setTeam(latest);
      })
      // What's on screen is still usable, and a save would report a real problem.
      .catch(() => {});
    return () => {
      closed = true;
    };
  }, [refreshOnOpen, startingTeam.teamCode]);

  const isTicked = (member) => changes[member.rollNumber] ?? Boolean(member.checkedInAt);
  const changedMembers = team.members.filter((member) => isTicked(member) !== Boolean(member.checkedInAt));
  const hasChanges = changedMembers.length > 0;
  const tickedCount = team.members.filter(isTicked).length;

  const toggle = (member) => {
    setError(null);
    setConfirmingDiscard(false);
    setChanges((current) => ({ ...current, [member.rollNumber]: !isTicked(member) }));
  };

  const dismiss = () => {
    if (saving) return;
    if (hasChanges) setConfirmingDiscard(true);
    else onClose();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { team: saved } = await saveAttendance(team.teamCode, {
        present: changedMembers.filter(isTicked).map((member) => member.rollNumber),
        absent: changedMembers.filter((member) => !isTicked(member)).map((member) => member.rollNumber),
      });
      navigator.vibrate?.(SAVE_VIBRATION_MS);
      onSaved(saved);
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired();
      else setError(requestError.message);
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      labelledBy={titleId}
      onDismiss={dismiss}
      resistDrag={hasChanges}
      header={(
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-white">{team.teamName}</h2>
            <p className="mt-1 text-sm text-graphite-300">{team.teamCode}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Close"
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-graphite-100 transition-colors duration-100 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    >
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-5 pb-3">
        {team.members.map((member) => (
          <MemberCheckbox key={member.rollNumber} member={member} checked={isTicked(member)} disabled={saving} onToggle={() => toggle(member)} />
        ))}
      </div>

      <div className="shrink-0 px-5 pb-5 pt-2">
        {confirmingDiscard ? (
          <div role="alert">
            <p className="mb-3 text-center text-[15px] text-white">Your ticks aren't saved yet. Discard them?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-14 rounded-2xl border border-white/[0.14] font-medium text-white transition-colors duration-100 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-white/[0.14]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDiscard(false)}
                className="h-14 rounded-2xl bg-white font-semibold text-graphite-950 transition-colors duration-100 hover:bg-graphite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:bg-graphite-200"
              >
                Keep editing
              </button>
            </div>
          </div>
        ) : (
          <>
            {error ? (
              <p role="alert" className="mb-3 text-center text-sm text-error-300">Not saved. {error}</p>
            ) : (
              <p role="status" className="mb-3 text-center text-sm text-graphite-200">{describeProgress(tickedCount, team.members.length, hasChanges)}</p>
            )}
            <motion.button
              type="button"
              onClick={save}
              disabled={!hasChanges || saving}
              whileTap={hasChanges && !saving ? { scale: 0.98 } : undefined}
              transition={SPRING_QUICK}
              className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${hasChanges ? 'bg-brand-600 text-white hover:bg-brand-500' : 'bg-white/[0.08] text-graphite-400'}`}
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              {saving ? 'Saving' : 'Save'}
            </motion.button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
