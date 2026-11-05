import { BASE_PATH } from '@shared/basePath.js';
import { apiRequest } from '@/lib/apiClient';

export const ATTENDANCE_CSV_URL = `${BASE_PATH}/api/admin/attendance.csv`;

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

export function getAdminTeam(teamCode) {
  return apiRequest(`/admin/teams/${encodeURIComponent(teamCode)}`);
}

export function saveAttendance(teamCode, { present, absent }) {
  return apiRequest(`/admin/teams/${encodeURIComponent(teamCode)}/attendance`, { method: 'POST', body: { present, absent } });
}
