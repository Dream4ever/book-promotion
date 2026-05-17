import { describe, expect, it } from 'vitest'
import { createReport, updateReport } from '../server/services/reportService.js'

function createDb() {
  return {
    schools: [{ id: 'school_1', province: '浙江', name: '杭州一中' }],
    books: [
      { id: 'book_1', title: '语文', isbn: 'isbn-1' },
      { id: 'book_2', title: '数学', isbn: 'isbn-2' },
    ],
    promoters: [{ id: 'promoter_1', name: '推广商一' }, { id: 'promoter_2', name: '推广商二' }],
    reports: [],
  }
}

describe('reportService', () => {
  it('creates a report with normalized all-mode book ids', () => {
    const db = createDb()
    const created = createReport(db, {
      schoolId: 'school_1',
      bookMode: 'all',
      promoterId: 'promoter_1',
      term: '2026年春',
    })

    expect(created.bookIds).toEqual(['book_1', 'book_2'])
    expect(created.createdAt).toEqual(expect.any(String))
    expect(db.reports[0]).toBe(created)
  })

  it('rejects reports that conflict on the same school, term, and book', () => {
    const db = createDb()
    createReport(db, {
      schoolId: 'school_1',
      bookMode: 'single',
      bookIds: ['book_1'],
      promoterId: 'promoter_1',
      term: '2026年春',
    })

    expect(() =>
      createReport(db, {
        schoolId: 'school_1',
        bookMode: 'single',
        bookIds: ['book_1'],
        promoterId: 'promoter_2',
        term: '2026年春',
      }),
    ).toThrow('不允许重复报备同一本书')
  })

  it('allows updating a report without conflicting with itself', () => {
    const db = createDb()
    const created = createReport(db, {
      schoolId: 'school_1',
      bookMode: 'single',
      bookIds: ['book_1'],
      promoterId: 'promoter_1',
      term: '2026年春',
    })

    const updated = updateReport(db, created.id, {
      schoolId: 'school_1',
      bookMode: 'single',
      bookIds: ['book_1', 'book_2'],
      promoterId: 'promoter_1',
      term: '2026年春',
      note: '更新备注',
    })

    expect(updated.bookIds).toEqual(['book_1', 'book_2'])
    expect(updated.note).toBe('更新备注')
    expect(updated.updatedAt).toEqual(expect.any(String))
  })
})
