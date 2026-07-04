import api from '../api/axios';

/**
 * Converts a relative path like "/uploads/profile/xyz.jpg" (returned by the
 * API) into an absolute URL pointing at the backend. The API's own baseURL
 * includes a "/api" suffix that must be stripped for static file URLs.
 */
export function buildFileUrl(relativePath) {
  if (!relativePath) return null;
  const origin = api.defaults.baseURL.replace(/\/api\/?$/, '');
  return `${origin}${relativePath}`;
}
