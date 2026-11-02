import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import TextField from '@/components/ui/TextField';

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete ?? 'current-password'}
      icon={<Lock className="h-[18px] w-[18px]" />}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-graphite-400 transition-colors hover:bg-graphite-800 hover:text-graphite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}
