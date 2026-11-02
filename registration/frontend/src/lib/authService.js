import { apiRequest } from '@/lib/apiClient';

export function registerTeam(team) {
  return apiRequest('/register', { method: 'POST', body: team });
}
