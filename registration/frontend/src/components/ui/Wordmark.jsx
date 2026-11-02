import { SITE_NAME } from '@/lib/site';

const SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-lg sm:text-xl',
  lg: 'text-4xl sm:text-6xl',
};

export default function Wordmark({ size = 'sm', className = '' }) {
  return (
    <span
      className={`font-display font-bold uppercase tracking-[0.12em] text-white select-none ${SIZE_CLASSES[size]} ${className}`}
      aria-label={SITE_NAME}
    >
      Gi<span className="text-metal">Together</span>
      <span className="ml-0.5 text-brand-600 drop-shadow-[0_0_12px_rgba(225,6,0,0.7)]">26</span>
    </span>
  );
}
