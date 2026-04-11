import { reactive } from 'vue'
import { api } from '../utils/api'

export function useRegistryStore() {
  const state = reactive({
    schools: [],
    books: [],
    promoters: [],
    reports: [],
    loading: false,
  })

  async function refresh() {
    state.loading = true
    try {
      const data = await api.fetchData()
      state.schools = data.schools || []
      state.books = data.books || []
      state.promoters = data.promoters || []
      state.reports = data.reports || []
    } finally {
      state.loading = false
    }
  }

  return {
    state,
    refresh,
  }
}
