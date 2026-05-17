import { describe, expect, it } from 'vitest'
import {
  cloneAgencyRecords,
  formatAgencyRecordsText,
  latestAgencyRecord,
  normalizeAgencyRecords,
} from '../src/utils/promoterAgencyRecords.js'

describe('promoterAgencyRecords', () => {
  it('normalizes legacy promoter agency fields into a yearly record', () => {
    expect(
      normalizeAgencyRecords(
        {
          id: 'promoter_1',
          agencyYear: '2025',
          agencyPeriod: '2025.01-2025.12',
          workload: '50 校',
          territories: [{ province: '浙江', accepting: true }],
        },
        { currentYear: 2026 },
      ),
    ).toEqual([
      {
        id: 'promoter_1_legacy',
        year: '2025',
        agencyPeriod: '2025.01-2025.12',
        workload: '50 校',
        territories: [{ province: '浙江', accepting: true }],
      },
    ])
  })

  it('clones agency records deeply before returning them', () => {
    const records = [
      {
        id: 'record_1',
        year: '2026',
        territories: [{ province: '江苏', accepting: false }],
      },
    ]
    const cloned = cloneAgencyRecords(records)

    cloned[0].territories[0].accepting = true

    expect(records[0].territories[0].accepting).toBe(false)
  })

  it('formats records and finds the latest year', () => {
    const records = [
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
    ]

    expect(latestAgencyRecord(records).id).toBe('record_2')
    expect(formatAgencyRecordsText(records)).toBe(
      '2025年: 浙江(接单) / - / 20 校；2026年: 江苏(不接单) / 2026.01-2026.12 / -',
    )
  })
})
