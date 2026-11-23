async function request(url, options = {}) {
  const { body, headers = {}, ...rest } = options;
  const isFormData = body instanceof FormData;

  const res = await fetch(url, {
    credentials: 'include',
    headers: isFormData
      ? headers
      : {
          'Content-Type': 'application/json',
          ...headers,
        },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    ...rest,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Respuesta inesperada del servidor.' };
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Error HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  getAuthStatus: () => request('/api/auth/status'),
  getMe: () => request('/api/auth/me'),
  previewInvite: (code) => request(`/api/auth/invite/${encodeURIComponent(code)}`),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  updateProfile: (payload) => request('/api/profile', { method: 'PATCH', body: payload }),
  uploadIcon: (file) => {
    const form = new FormData();
    form.append('icon', file);
    return request('/api/profile/icon', { method: 'POST', body: form });
  },

  getAvailability: (month, calendar) =>
    request(`/api/availability?month=${encodeURIComponent(month)}&calendar=${encodeURIComponent(calendar)}`),
  setAvailability: (date, payload) =>
    request(`/api/availability/${encodeURIComponent(date)}`, { method: 'PUT', body: payload }),
  deleteAvailability: (date, calendar) =>
    request(`/api/availability/${encodeURIComponent(date)}?calendar=${encodeURIComponent(calendar)}`, {
      method: 'DELETE',
    }),

  getInvites: () => request('/api/admin/invites'),
  createInvite: (payload) => request('/api/admin/invites', { method: 'POST', body: payload }),
  deleteInvite: (id) => request(`/api/admin/invites/${id}`, { method: 'DELETE' }),
  getAdminUsers: () => request('/api/admin/users'),
  updateUserRoles: (id, payload) =>
    request(`/api/admin/users/${id}/roles`, { method: 'PATCH', body: payload }),
};
