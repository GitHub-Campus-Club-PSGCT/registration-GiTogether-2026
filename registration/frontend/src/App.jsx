import { Suspense, lazy } from 'react';
import { MotionConfig } from 'motion/react';
import RegisterPage from '@/components/auth/RegisterPage';

const AdminPage = lazy(() => import('@/components/admin/AdminPage'));

const isAdminPath = () => /^\/admin(\/dashboard)?\/?$/.test(window.location.pathname);

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      {isAdminPath() ? (
        <Suspense fallback={null}>
          <AdminPage />
        </Suspense>
      ) : (
        <RegisterPage />
      )}
    </MotionConfig>
  );
}
