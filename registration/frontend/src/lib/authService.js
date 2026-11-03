import { apiRequest } from '@/lib/apiClient';

export function registerTeam(team) {
  return apiRequest('/register', { method: 'POST', body: team });
}

export function getRegistrationStatus() {
  return apiRequest('/status');
}

export function adminLogin(password) {
  return apiRequest('/admin/login', { method: 'POST', body: { password } });
}

export function adminLogout() {
  return apiRequest('/admin/logout', { method: 'POST' });
}

export function getAdminTeams() {
  return apiRequest('/admin/teams');
}
