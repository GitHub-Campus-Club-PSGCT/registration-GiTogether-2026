import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLogin from '@/components/admin/AdminLogin';
import AmbientBackground from '@/components/layout/AmbientBackground';
import { adminLogout, getAdminTeams } from '@/lib/authService';
import { RACE_IMAGES } from '@/lib/images';

const AUTO_REFRESH_MS = 30 * 1000;

export default function AdminPage() {
  const [status, setStatus] = useState('checking');
  const [teams, setTeams] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getAdminTeams();
      setTeams(data.teams);
      setLoadError(null);
      setStatus('open');
    } catch (error) {
      if (error.status === 401) {
        setStatus('locked');
      } else {
        // Keep showing what's already loaded if a refresh fails.
        setLoadError(error.message);
        setStatus('open');
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status !== 'open') return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [status, load]);

  const handleTeamChange = useCallback((updated) => {
    setTeams((current) => (current.some((team) => team.teamCode === updated.teamCode)
      ? current.map((team) => (team.teamCode === updated.teamCode ? updated : team))
      : [updated, ...current]));
  }, []);

  const handleLogout = async () => {
    await adminLogout().catch(() => {});
    setTeams([]);
    setStatus('locked');
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground imageSrc={RACE_IMAGES.blackWhiteNight} />
      <AnimatePresence mode="wait">
        {status === 'locked' && <AdminLogin key="login" onSuccess={load} />}
        {status === 'open' && (
          <AdminDashboard key="dashboard" teams={teams} loadError={loadError} refreshing={refreshing} onRefresh={load} onLogout={handleLogout} onTeamChange={handleTeamChange} />
        )}
      </AnimatePresence>
    </div>
  );
}
