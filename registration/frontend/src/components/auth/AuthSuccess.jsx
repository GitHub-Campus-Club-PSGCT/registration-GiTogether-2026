import { CheckCircle2 } from 'lucide-react';
import SubmitButton from '@/components/ui/SubmitButton';

export default function AuthSuccess({ title, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center py-4 text-center animate-fade-up">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-success-500/40 bg-success-500/10 shadow-[0_0_32px_-4px_rgba(34,197,94,0.5)]">
        <CheckCircle2 className="h-8 w-8 text-success-400" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-[1.5] text-graphite-300">{message}</p>
      <SubmitButton onClick={onAction} className="mt-8">
        {actionLabel}
      </SubmitButton>
    </div>
  );
}
