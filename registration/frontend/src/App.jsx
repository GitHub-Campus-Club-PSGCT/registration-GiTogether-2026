import { Suspense, lazy } from 'react';
import { MotionConfig } from 'motion/react';
import { BASE_PATH } from '@shared/basePath.js';
import RegisterPage from '@/components/auth/RegisterPage';

const AdminPage = lazy(() => import('@/components/admin/AdminPage'));

const isAdminPath = () => /^\/admin(\/dashboard)?\/?$/.test(window.location.pathname.slice(BASE_PATH.length));

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
