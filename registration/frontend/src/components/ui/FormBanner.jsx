import { AlertCircle } from 'lucide-react';

export default function FormBanner({ message }) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-300 animate-shake"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
