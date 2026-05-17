import {
  resolveReportBookMode,
  resolveReportExcludedBookIds,
  resolveReportSavedBookIds,
  resolveReportSpecificBookIds,
  resolveReportTerm,
} from '#shared/reportRules.js'

export function formatBookOption(book) {
  return book ? `${book.title} (${book.isbn})` : '书目已删除'
}

export function resolveReportSpecificBooks(report, books = []) {
  return resolveReportSpecificBookIds(report)
    .map((id) => books.find((book) => book.id === id))
    .filter(Boolean)
}

export function resolveReportExcludedBooks(report, books = []) {
  return resolveReportExcludedBookIds(report, books)
    .map((id) => books.find((book) => book.id === id))
    .filter(Boolean)
}

export function formatReportBookLabel(bookMode, specificBooks, excludedBooks) {
  if (bookMode === 'all') return '所有图书'
  if (bookMode === 'exclude') {
    if (!excludedBooks.length) return '排除指定图书'
    return `排除 ${excludedBooks.length} 本：${excludedBooks.map(formatBookOption).join('、')}`
  }
  if (!specificBooks.length) return '书目已删除'
  if (specificBooks.length === 1) return formatBookOption(specificBooks[0])
  return `指定 ${specificBooks.length} 本：${specificBooks.map(formatBookOption).join('、')}`
}

export function formatReportBookSearchText(bookMode, specificBooks, excludedBooks) {
  if (bookMode === 'all') return '所有图书 推广所有图书'
  if (bookMode === 'exclude') {
    return `排除指定图书 只有所选图书不推广 ${excludedBooks.map(formatBookOption).join(' ')}`
  }
  return specificBooks.length
    ? `指定图书 ${specificBooks.map((book) => `${book.title} ${book.isbn}`).join(' ')}`
    : '书目已删除'
}

export function buildReportViewModel(report, { schools = [], books = [], promoters = [] } = {}) {
  const school = schools.find((item) => item.id === report.schoolId)
  const promoter = promoters.find((item) => item.id === report.promoterId)
  const bookMode = resolveReportBookMode(report)
  const specificBooks = bookMode === 'single' ? resolveReportSpecificBooks(report, books) : []
  const excludedBooks = resolveReportExcludedBooks(report, books)

  return {
    ...report,
    bookMode,
    bookIds:
      bookMode === 'single'
        ? resolveReportSpecificBookIds(report)
        : resolveReportSavedBookIds(report, books),
    province: school?.province || '',
    schoolName: school?.name || '学校已删除',
    schoolLabel: school ? `${school.province} / ${school.name}` : '学校已删除',
    bookTitle: specificBooks.map((book) => book.title).join('、') || '书目已删除',
    isbn: specificBooks.map((book) => book.isbn).join('、'),
    bookLabel: formatReportBookLabel(bookMode, specificBooks, excludedBooks),
    bookSearchText: formatReportBookSearchText(bookMode, specificBooks, excludedBooks),
    term: resolveReportTerm(report),
    promoterName: promoter?.name || '推广商已删除',
    promoterLabel: promoter?.name || '推广商已删除',
  }
}
