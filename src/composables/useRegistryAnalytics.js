import { computed, reactive } from 'vue'
import { reportMatchesBook } from '../../shared/reportRules.js'

function summarizeRows(rows, labelGetter, labelName) {
  const map = new Map()
  rows.forEach((item) => {
    const label = labelGetter(item)
    map.set(label, (map.get(label) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([name, count]) => ({ [labelName]: name, 报备数量: count }))
    .sort((a, b) => b.报备数量 - a.报备数量)
}

export function useRegistryAnalytics(joinedReports) {
  const analyticsFilters = reactive({
    term: '',
    province: '',
    promoterId: '',
    bookId: '',
  })

  const analyticsDetail = reactive({
    title: '',
    rows: [],
  })

  const analyticsReportRows = computed(() =>
    joinedReports.value.filter((item) => {
      if (analyticsFilters.term && item.term !== analyticsFilters.term) return false
      if (analyticsFilters.province && item.province !== analyticsFilters.province) return false
      if (analyticsFilters.promoterId && item.promoterId !== analyticsFilters.promoterId) return false
      if (analyticsFilters.bookId && !reportMatchesBook(item, analyticsFilters.bookId)) return false
      return true
    }),
  )

  const provinceStats = computed(() =>
    summarizeRows(analyticsReportRows.value, (item) => item.province || '未识别省份', '省份'),
  )

  const promoterStats = computed(() =>
    summarizeRows(analyticsReportRows.value, (item) => item.promoterName || '未知推广商', '推广商'),
  )

  const bookStats = computed(() =>
    summarizeRows(analyticsReportRows.value, (item) => item.bookLabel || '未知书目', '书目'),
  )

  function openAnalyticsDetail(title, rows) {
    analyticsDetail.title = title
    analyticsDetail.rows = rows
  }

  function closeAnalyticsDetail() {
    analyticsDetail.title = ''
    analyticsDetail.rows = []
  }

  function analyticsRowsBy(field, value) {
    return analyticsReportRows.value.filter((item) => item[field] === value)
  }

  function openAnalyticsStatDetail({ title, field, value }) {
    openAnalyticsDetail(title, analyticsRowsBy(field, value))
  }

  return {
    analyticsFilters,
    analyticsDetail,
    analyticsReportRows,
    provinceStats,
    promoterStats,
    bookStats,
    openAnalyticsStatDetail,
    closeAnalyticsDetail,
  }
}
