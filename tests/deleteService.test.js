import { describe, expect, it } from 'vitest'
import { deleteByKind } from '../server/services/deleteService.js'

function createDb() {
  return {
    schools: [{ id: 'school_1' }, { id: 'school_2' }],
    books: [{ id: 'book_1' }, { id: 'book_2' }],
    promoters: [{ id: 'promoter_1' }, { id: 'promoter_2' }],
    reports: [
      {
        id: 'report_1',
        schoolId: 'school_1',
        bookMode: 'single',
        bookId: 'book_1',
        bookIds: ['book_1'],
        promoterId: 'promoter_1',
        term: '2026年春',
      },
      {
        id: 'report_2',
        schoolId: 'school_2',
        bookMode: 'single',
        bookId: 'book_1',
        bookIds: ['book_1', 'book_2'],
        promoterId: 'promoter_2',
        term: '2026年春',
      },
    ],
  }
}

describe('deleteService', () => {
  it('cascades school deletion to reports', () => {
    const db = createDb()
    deleteByKind(db, 'schools', ['school_1'])

    expect(db.schools.map((item) => item.id)).toEqual(['school_2'])
    expect(db.reports.map((item) => item.id)).toEqual(['report_2'])
  })

  it('removes deleted books from reports and drops empty reports', () => {
    const db = createDb()
    deleteByKind(db, 'books', ['book_1'])

    expect(db.books.map((item) => item.id)).toEqual(['book_2'])
    expect(db.reports).toEqual([
      {
        id: 'report_2',
        schoolId: 'school_2',
        bookMode: 'single',
        bookId: 'book_2',
        bookIds: ['book_2'],
        promoterId: 'promoter_2',
        term: '2026年春',
      },
    ])
  })
})
