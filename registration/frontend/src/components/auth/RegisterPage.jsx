import { useEffect, useState } from 'react';
import AmbientBackground from '@/components/layout/AmbientBackground';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import AuthCard from '@/components/auth/AuthCard';
import AuthHeading from '@/components/auth/AuthHeading';
import RegisterForm from '@/components/auth/RegisterForm';
import { getRegistrationStatus } from '@/lib/authService';
import { RACE_IMAGES } from '@/lib/images';

export default function RegisterPage() {
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    // The form stays visible if this check fails, and the API still rejects sign-ups while closed.
    getRegistrationStatus()
      .then((status) => setRegistrationOpen(status.registrationOpen))
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientBackground imageSrc={RACE_IMAGES.blackWhiteNight} />
      <SiteHeader />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14 lg:py-6">
        {registrationOpen ? (
          <RegisterForm />
        ) : (
          <AuthCard>
            <AuthHeading
              eyebrow="Team Registration"
              title="Registration is closed"
              description="We're not taking new teams right now."
            />
          </AuthCard>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
