import { EVENT_DATE, EVENT_DATE_LABEL } from '@shared/teamRules.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Counts calendar days in India, so it changes at midnight there wherever the visitor is.
const getDaysLeft = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return Math.round((Date.parse(EVENT_DATE) - Date.parse(today)) / DAY_MS);
};

const getCountdownText = (daysLeft) => {
  if (daysLeft === 0) return 'Lights out today';
  if (daysLeft === 1) return 'Lights out tomorrow';
  return `Lights out in ${daysLeft} days`;
};

export default function EventCountdown() {
  const daysLeft = getDaysLeft();
  if (daysLeft < 0) return null;

  return (
    <p className="mt-1.5 text-center font-display text-xs font-bold uppercase tracking-[0.12em] sm:text-[13px]">
      <span className="text-brand-400">{getCountdownText(daysLeft)}</span>
      <span className="text-graphite-300"> · </span>
      <time dateTime={EVENT_DATE} className="text-graphite-300">{EVENT_DATE_LABEL}</time>
    </p>
  );
}
