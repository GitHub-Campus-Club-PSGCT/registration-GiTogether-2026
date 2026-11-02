import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export default function TextField({ label, error, icon, endAdornment, id, className = '', ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-graphite-300">
        {label}
      </label>
      <div
        className={`group relative flex items-center rounded-xl border bg-graphite-900/80 transition-all duration-300 focus-within:bg-graphite-900 ${
          error
            ? 'border-error-500/70 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
            : 'border-graphite-600/80 hover:border-graphite-500 focus-within:border-brand-600 focus-within:shadow-[0_0_0_3px_rgba(225,6,0,0.18),0_0_24px_-6px_rgba(225,6,0,0.5)]'
        }`}
      >
        {icon && <span className="pointer-events-none pl-4 text-graphite-400 transition-colors group-focus-within:text-brand-500">{icon}</span>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-12 w-full bg-transparent px-4 text-[15px] text-graphite-50 placeholder:text-graphite-500 focus:outline-none ${
            icon ? 'pl-3' : ''
          } ${endAdornment ? 'pr-2' : ''}`}
          {...inputProps}
        />
        {endAdornment}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-error-400 animate-fade-in">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
