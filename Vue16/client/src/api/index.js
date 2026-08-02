import request from './request'

export const authApi = {
  captcha: () => request.get('/auth/captcha'),
  login: (data) => request.post('/auth/login', data),
  me: () => request.get('/auth/me'),
  permissions: () => request.get('/auth/permissions')
}

export const userApi = {
  list: (params) => request.get('/users', { params }),
  create: (data) => request.post('/users', data),
  update: (id, data) => request.put(`/users/${id}`, data),
  remove: (id) => request.delete(`/users/${id}`)
}

export const dataApi = {
  diseases: () => request.get('/data/diseases'),
  createDisease: (data) => request.post('/data/diseases', data),
  updateDisease: (id, data) => request.put(`/data/diseases/${id}`, data),
  removeDisease: (id) => request.delete(`/data/diseases/${id}`),
  records: (params) => request.get('/data/records', { params }),
  createRecord: (data) => request.post('/data/records', data),
  updateRecord: (id, data) => request.put(`/data/records/${id}`, data),
  removeRecord: (id) => request.delete(`/data/records/${id}`),
  exportRecords: () => request.get('/data/export/records', { responseType: 'blob' }),
  importRecords: (formData) => request.post('/data/import/records', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  overview: () => request.get('/data/dashboard/overview'),
  model3d: () => request.get('/data/dashboard/model3d')
}

export const predictApi = {
  models: () => request.get('/predict/models'),
  defaults: () => request.get('/predict/defaults'),
  run: (data) => {
    if (data instanceof FormData) {
      return request.post('/predict/run', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    return request.post('/predict/run', data)
  }
}

export const settingsApi = {
  get: () => request.get('/settings'),
  save: (data) => request.put('/settings', data),
  dbConfig: () => request.get('/settings/db-config'),
  createDbConfig: (data) => request.post('/settings/db-config', data),
  updateDbConfig: (id, data) => request.put(`/settings/db-config/${id}`, data),
  activateDb: (id) => request.post(`/settings/db-config/${id}/activate`),
  removeDbConfig: (id) => request.delete(`/settings/db-config/${id}`),
  dbInfo: () => request.get('/settings/db-info')
}
