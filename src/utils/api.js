async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || '请求失败')
  }

  return response.json()
}

export const api = {
  fetchData() {
    return request('/api/data')
  },
  createSchool(payload) {
    return request('/api/schools', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateSchool(id, payload) {
    return request(`/api/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  createBook(payload) {
    return request('/api/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateBook(id, payload) {
    return request(`/api/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  createPromoter(payload) {
    return request('/api/promoters', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updatePromoter(id, payload) {
    return request(`/api/promoters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  createReport(payload) {
    return request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateReport(id, payload) {
    return request(`/api/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  importRows(kind, rows) {
    return request(`/api/import/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
  },
  batchDelete(kind, ids) {
    return request(`/api/batch-delete/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },
  deleteSchool(id) {
    return request(`/api/schools/${id}`, { method: 'DELETE' })
  },
  deleteBook(id) {
    return request(`/api/books/${id}`, { method: 'DELETE' })
  },
  deletePromoter(id) {
    return request(`/api/promoters/${id}`, { method: 'DELETE' })
  },
  deleteReport(id) {
    return request(`/api/reports/${id}`, { method: 'DELETE' })
  },
}
