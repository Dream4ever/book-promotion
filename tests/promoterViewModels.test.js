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

  it('uses empty agency fields when no records exist', () => {
    const viewModel = buildPromoterViewModel({
      id: 'promoter_1',
      name: '华东推广',
    })

    expect(viewModel.agencyRecords).toEqual([])
    expect(viewModel.latestAgencyYear).toBe('-')
    expect(viewModel.latestAgencyText).toBe('-')
    expect(viewModel.agencyRecordCount).toBe(0)
  })
})
