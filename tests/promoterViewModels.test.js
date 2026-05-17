import { describe, expect, it } from 'vitest'
import { buildPromoterViewModel } from '../src/utils/promoterViewModels.js'

describe('promoterViewModels', () => {
  it('builds list display fields from normalized agency records', () => {
    const viewModel = buildPromoterViewModel({
      id: 'promoter_1',
      name: '华东推广',
      contact: '张三',
      phone: '13800000000',
      agencyRecords: [
        {
          id: 'record_1',
          year: '2025',
          agencyPeriod: '',
          workload: '20 校',
          territories: [{ province: '浙江', accepting: true }],
        },
        {
          id: 'record_2',
          year: '2026',
          agencyPeriod: '2026.01-2026.12',
          workload: '',
          territories: [{ province: '江苏', accepting: false }],
        },
      ],
    })

    expect(viewModel.latestAgencyYear).toBe('2026')
    expect(viewModel.latestAgencyText).toBe('江苏(不接单) / 2026.01-2026.12 / -')
    expect(viewModel.agencyRecordCount).toBe(2)
    expect(viewModel.searchText).toContain('江苏(不接单)')
  })

  it('keeps legacy promoter data visible in the list model', () => {
    const viewModel = buildPromoterViewModel({
      id: 'promoter_1',
      name: '华东推广',
      agencyYear: '2024',
      workload: '30 校',
      territories: [{ province: '安徽', accepting: true }],
    })

    expect(viewModel.agencyRecords).toEqual([
      {
        id: 'promoter_1_legacy',
        year: '2024',
        agencyPeriod: '',
        workload: '30 校',
        territories: [{ province: '安徽', accepting: true }],
      },
    ])
    expect(viewModel.latestAgencyYear).toBe('2024')
    expect(viewModel.latestAgencyText).toBe('安徽(接单) / - / 30 校')
  })
})
