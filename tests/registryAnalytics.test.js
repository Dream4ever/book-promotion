import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useRegistryAnalytics } from '../src/composables/useRegistryAnalytics.js'

const reports = [
  {
    id: 'report_1',
    term: '2026年春',
    province: '浙江',
    promoterId: 'promoter_1',
    promoterName: '华东推广',
    bookMode: 'single',
    bookIds: ['book_1'],
    bookLabel: '语文 (isbn-1)',
  },
  {
    id: 'report_2',
    term: '2026年秋',
    province: '江苏',
    promoterId: 'promoter_2',
    promoterName: '华北推广',
    bookMode: 'single',
    bookIds: ['book_2'],
    bookLabel: '数学 (isbn-2)',
  },
  {
    id: 'report_3',
    term: '2026年春',
    province: '浙江',
    promoterId: 'promoter_1',
    promoterName: '华东推广',
    bookMode: 'all',
    bookIds: ['book_1', 'book_2'],
    bookLabel: '所有图书',
  },
]

describe('useRegistryAnalytics', () => {
  it('filters report rows and summarizes dimensions', () => {
    const analytics = useRegistryAnalytics(ref(reports))

    analytics.analyticsFilters.term = '2026年春'
    analytics.analyticsFilters.province = '浙江'
    analytics.analyticsFilters.promoterId = 'promoter_1'
    analytics.analyticsFilters.bookId = 'book_1'

    expect(analytics.analyticsReportRows.value.map((item) => item.id)).toEqual([
      'report_1',
      'report_3',
    ])
    expect(analytics.provinceStats.value).toEqual([{ 省份: '浙江', 报备数量: 2 }])
    expect(analytics.promoterStats.value).toEqual([{ 推广商: '华东推广', 报备数量: 2 }])
  })

  it('opens and closes analytics detail rows', () => {
    const analytics = useRegistryAnalytics(ref(reports))

    analytics.openAnalyticsStatDetail({
      title: '浙江 报备明细',
      field: 'province',
      value: '浙江',
    })

    expect(analytics.analyticsDetail.title).toBe('浙江 报备明细')
    expect(analytics.analyticsDetail.rows.map((item) => item.id)).toEqual(['report_1', 'report_3'])

    analytics.closeAnalyticsDetail()

    expect(analytics.analyticsDetail.title).toBe('')
    expect(analytics.analyticsDetail.rows).toEqual([])
  })
})
