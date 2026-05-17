import { describe, expect, it } from 'vitest'
import { buildReportViewModel } from '../src/utils/reportViewModels.js'

const schools = [{ id: 'school_1', province: '浙江', name: '杭州一中' }]
const books = [
  { id: 'book_1', title: '语文', isbn: 'isbn-1' },
  { id: 'book_2', title: '数学', isbn: 'isbn-2' },
  { id: 'book_3', title: '英语', isbn: 'isbn-3' },
]
const promoters = [{ id: 'promoter_1', name: '华东推广' }]

describe('reportViewModels', () => {
  it('builds single-book labels and search text', () => {
    const viewModel = buildReportViewModel(
      {
        id: 'report_1',
        schoolId: 'school_1',
        bookMode: 'single',
        bookIds: ['book_1', 'book_2'],
        promoterId: 'promoter_1',
        term: '2026年春',
      },
      { schools, books, promoters },
    )

    expect(viewModel.schoolLabel).toBe('浙江 / 杭州一中')
    expect(viewModel.bookLabel).toBe('指定 2 本：语文 (isbn-1)、数学 (isbn-2)')
    expect(viewModel.bookSearchText).toBe('指定图书 语文 isbn-1 数学 isbn-2')
    expect(viewModel.promoterLabel).toBe('华东推广')
  })

  it('builds all-book labels from the saved book set', () => {
    const viewModel = buildReportViewModel(
      {
        id: 'report_1',
        schoolId: 'school_1',
        bookMode: 'all',
        bookIds: ['book_1', 'book_2', 'book_3'],
        promoterId: 'promoter_1',
        term: '2026年春',
      },
      { schools, books, promoters },
    )

    expect(viewModel.bookLabel).toBe('所有图书')
    expect(viewModel.bookIds).toEqual(['book_1', 'book_2', 'book_3'])
    expect(viewModel.bookSearchText).toBe('所有图书 推广所有图书')
  })

  it('builds exclude-mode labels from books not saved on the report', () => {
    const viewModel = buildReportViewModel(
      {
        id: 'report_1',
        schoolId: 'school_1',
        bookMode: 'exclude',
        bookIds: ['book_1', 'book_3'],
        promoterId: 'promoter_1',
        term: '2026年春',
      },
      { schools, books, promoters },
    )

    expect(viewModel.bookLabel).toBe('排除 1 本：数学 (isbn-2)')
    expect(viewModel.bookSearchText).toBe('排除指定图书 只有所选图书不推广 数学 (isbn-2)')
  })
})
