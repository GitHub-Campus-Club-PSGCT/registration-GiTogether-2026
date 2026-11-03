import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import AuthCard from '@/components/auth/AuthCard';
import FormBanner from '@/components/ui/FormBanner';
import SubmitButton from '@/components/ui/SubmitButton';
import TextField from '@/components/ui/TextField';
import { adminLogin } from '@/lib/authService';
import { collapseProps, riseVariants } from '@/lib/motion';

export default function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminLogin(password);
      onSuccess();
    } catch (loginError) {
      setError(loginError.message);
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <AuthCard>
        <motion.h1 variants={riseVariants} className="mb-6 text-center font-display text-3xl font-bold text-white">
          Enter password :)
        </motion.h1>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div {...collapseProps} className="overflow-hidden">
              <FormBanner message={error} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form variants={riseVariants} onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<KeyRound className="h-[18px] w-[18px]" />}
          />
          <SubmitButton loading={submitting} disabled={!password}>
            Enter
          </SubmitButton>
        </motion.form>
      </AuthCard>
    </main>
  );
}
