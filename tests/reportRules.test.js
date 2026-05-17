import { describe, expect, it } from 'vitest'
import {
  findReportConflicts,
  normalizeReportPayload,
  reportMatchesBook,
  resolveReportExcludedBookIds,
  resolveReportSavedBookIds,
} from '../shared/reportRules.js'

const books = [
  { id: 'book_1', title: '语文', isbn: 'isbn-1' },
  { id: 'book_2', title: '数学', isbn: 'isbn-2' },
  { id: 'book_3', title: '英语', isbn: 'isbn-3' },
]

describe('reportRules', () => {
  it('normalizes all mode to the actual saved book set', () => {
    const normalized = normalizeReportPayload(
      {
        schoolId: 'school_1',
        bookMode: 'all',
        promoterId: 'promoter_1',
        term: '2026年春',
      },
      books,
    )

    expect(normalized.bookId).toBe('')
    expect(normalized.bookIds).toEqual(['book_1', 'book_2', 'book_3'])
    expect(normalized.note).toBe('推广所有图书')
  })

  it('normalizes exclude mode from excluded ids to saved promoted ids', () => {
    const normalized = normalizeReportPayload(
      {
        schoolId: 'school_1',
        bookMode: 'exclude',
        bookIds: ['book_2'],
        promoterId: 'promoter_1',
        term: '2026年春',
      },
      books,
    )

    expect(normalized.bookIds).toEqual(['book_1', 'book_3'])
    expect(resolveReportExcludedBookIds(normalized, books)).toEqual(['book_2'])
  })

  it('detects conflicts by school, term, and overlapping saved book ids', () => {
    const existing = [
      {
        id: 'report_1',
        schoolId: 'school_1',
        bookMode: 'single',
        bookIds: ['book_1', 'book_2'],
        promoterId: 'promoter_1',
        term: '2026年春',
      },
    ]
    const next = normalizeReportPayload(
      {
        schoolId: 'school_1',
        bookMode: 'exclude',
        bookIds: ['book_3'],
        promoterId: 'promoter_2',
        term: '2026年春',
      },
      books,
    )

    expect(resolveReportSavedBookIds(next, books)).toEqual(['book_1', 'book_2'])
    expect(findReportConflicts(existing, next, '', books)).toEqual([
      {
        report: existing[0],
        bookIds: ['book_1', 'book_2'],
      },
    ])
  })

  it('matches legacy all-mode reports without stored book ids', () => {
    expect(reportMatchesBook({ bookMode: 'all', bookIds: [] }, 'book_1')).toBe(true)
  })
})
