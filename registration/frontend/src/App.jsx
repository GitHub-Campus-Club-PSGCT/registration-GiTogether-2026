import { MotionConfig } from 'motion/react';
import RegisterPage from '@/components/auth/RegisterPage';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RegisterPage />
    </MotionConfig>
  );
}
