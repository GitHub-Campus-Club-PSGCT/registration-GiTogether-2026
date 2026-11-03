import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { collapseProps } from '@/lib/motion';

export default function TextField({ label, error, icon, endAdornment, id, className = '', ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-[13px] font-medium text-graphite-200">
        {label}
      </label>
      <div
        className={`group relative flex items-center rounded-xl border bg-graphite-900/80 transition duration-150 focus-within:bg-graphite-900 ${
          error
            ? 'border-error-500/70 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
            : 'border-graphite-600/80 hover:border-graphite-500 focus-within:border-brand-600 focus-within:shadow-[0_0_0_3px_rgba(225,6,0,0.18),0_0_24px_-6px_rgba(225,6,0,0.5)]'
        }`}
      >
        {icon && (
          <span className="pointer-events-none pl-4">
            <span className="block text-graphite-400 transition-[color,filter] duration-300 group-focus-within:animate-icon-wave group-focus-within:text-brand-500 group-focus-within:drop-shadow-[0_0_6px_rgba(240,30,18,0.7)]">
              {icon}
            </span>
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-12 w-full min-w-0 text-ellipsis bg-transparent px-4 text-base text-graphite-50 placeholder:text-graphite-400 focus:outline-none sm:text-[15px] ${
            icon ? 'pl-3' : ''
          } ${endAdornment ? 'pr-2' : ''}`}
          {...inputProps}
        />
        {endAdornment}
        <span
          className="pointer-events-none absolute inset-x-4 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-brand-700 via-brand-500 to-brand-300 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-x-100"
          aria-hidden="true"
        />
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.div {...collapseProps} className="overflow-hidden">
            <p id={errorId} role="alert" className="flex items-start gap-1.5 pt-2 text-sm text-error-400">
              <AlertCircle className="mt-[3px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
