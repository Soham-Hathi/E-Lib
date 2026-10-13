let url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
  url = `https://${url}`;
}
export const API_BASE_URL = url.replace(/\/$/, '');
export default API_BASE_URL;
