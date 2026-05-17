import { describe, expect, it } from 'vitest'
import {
  buildAgencyRecordRows,
  buildReportBookRows,
  buildTerritoryRows,
  groupBy,
  mapAgencyRecordRow,
  mapReportRow,
  orderRows,
  pickByIds,
} from '../server/dbRows.js'

describe('dbRows', () => {
  it('orders rows and groups them by a foreign key', () => {
    const rows = [
      { id: 'b', parent_id: 'p1', sort_order: 2 },
      { id: 'a', parent_id: 'p1', sort_order: 1 },
      { id: 'c', parent_id: 'p2', sort_order: 1 },
    ]

    const ordered = orderRows(rows)
    const grouped = groupBy(ordered, 'parent_id')

    expect(ordered.map((item) => item.id)).toEqual(['a', 'c', 'b'])
    expect(grouped.get('p1').map((item) => item.id)).toEqual(['a', 'b'])
    expect(grouped.get('p2').map((item) => item.id)).toEqual(['c'])
  })

  it('maps Supabase agency and report rows into app records', () => {
    const territoriesByRecordId = new Map([
      ['record_1', [{ province: '浙江', accepting: true }]],
    ])
    const bookIdsByReportId = new Map([['report_1', ['book_1', 'book_2']]])

    expect(
      mapAgencyRecordRow(
        {
          id: 'record_1',
          year: '2026',
          agency_period: '2026.01-2026.12',
          workload: '50 校',
        },
        territoriesByRecordId,
      ),
    ).toEqual({
      id: 'record_1',
      year: '2026',
      agencyPeriod: '2026.01-2026.12',
      workload: '50 校',
      territories: [{ province: '浙江', accepting: true }],
    })

    expect(
      mapReportRow(
        {
          id: 'report_1',
          school_id: 'school_1',
          book_mode: 'single',
          promoter_id: 'promoter_1',
          term: '2026年春',
        },
        bookIdsByReportId,
      ),
    ).toMatchObject({
      id: 'report_1',
      schoolId: 'school_1',
      bookMode: 'single',
      bookIds: ['book_1', 'book_2'],
      promoterId: 'promoter_1',
      term: '2026年春',
    })
  })

  it('builds relation rows from normalized promoters and reports', () => {
    const promoters = [
      {
        id: 'promoter_1',
        agencyRecords: [
          {
            id: 'record_1',
            year: '2026',
            agencyPeriod: '2026.01-2026.12',
            workload: '50 校',
            territories: [{ province: '浙江', accepting: true }],
          },
        ],
      },
    ]
    const reports = [{ id: 'report_1', bookIds: ['book_1', 'book_2'] }]

    expect(buildAgencyRecordRows(promoters)).toEqual([
      {
        id: 'record_1',
        promoter_id: 'promoter_1',
        year: '2026',
        agency_period: '2026.01-2026.12',
        workload: '50 校',
        sort_order: 0,
      },
    ])
    expect(buildTerritoryRows(promoters)).toEqual([
      {
        agency_record_id: 'record_1',
        province: '浙江',
        accepting: true,
        sort_order: 0,
      },
    ])
    expect(buildReportBookRows(reports)).toEqual([
      { report_id: 'report_1', book_id: 'book_1', sort_order: 0 },
      { report_id: 'report_1', book_id: 'book_2', sort_order: 1 },
    ])
    expect(pickByIds([{ id: 'a' }, { id: 'b' }], ['b'])).toEqual([{ id: 'b' }])
  })
})
