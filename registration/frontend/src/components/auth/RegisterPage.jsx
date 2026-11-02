import AmbientBackground from '@/components/layout/AmbientBackground';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import AuthCard from '@/components/auth/AuthCard';
import RegisterForm from '@/components/auth/RegisterForm';
import { RACE_IMAGES } from '@/lib/images';

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientBackground imageSrc={RACE_IMAGES.blackWhiteNight} />
      <SiteHeader />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full animate-reveal-card">
          <AuthCard>
            <div className="animate-fade-up">
              <RegisterForm registrationType="online" />
            </div>
          </AuthCard>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
