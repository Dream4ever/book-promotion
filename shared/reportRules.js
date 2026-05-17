export const REPORT_BOOK_MODES = ['single', 'all', 'exclude']

const DEFAULT_ALL_BOOKS_NOTE = '\u63a8\u5e7f\u6240\u6709\u56fe\u4e66'
const DEFAULT_EXCLUDE_BOOKS_NOTE =
  '\u53ea\u6709\u6240\u9009\u56fe\u4e66\u4e0d\u63a8\u5e7f'

export function normalizeText(value) {
  return String(value ?? '').trim()
}

export function normalizeTermText(value) {
  return normalizeText(value)
}

export function resolveReportBookMode(report) {
  return REPORT_BOOK_MODES.includes(report?.bookMode) ? report.bookMode : 'single'
}

export function normalizeBookIdList(value) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(normalizeText).filter(Boolean)))
    : []
}

export function resolveAvailableBookIds(books = []) {
  return normalizeBookIdList(books.map((book) => book?.id))
}

export function resolveReportSpecificBookIds(report) {
  return Array.from(
    new Set([
      ...normalizeBookIdList(report?.bookIds),
      normalizeText(report?.bookId),
    ].filter(Boolean)),
  )
}

export function inferReportTerm(createdAt, now = new Date()) {
  const date = createdAt ? new Date(createdAt) : now
  const isInvalid = Number.isNaN(date.getTime())
  const year = isInvalid ? now.getFullYear() : date.getFullYear()
  const month = isInvalid ? now.getMonth() + 1 : date.getMonth() + 1
  return `${year}\u5e74${month >= 8 ? '\u79cb' : '\u6625'}`
}

export function resolveReportTerm(report, now = new Date()) {
  const term = normalizeTermText(report?.term)
  return term || inferReportTerm(report?.createdAt, now)
}

export function resolveReportSavedBookIds(report, books = []) {
  const bookMode = resolveReportBookMode(report)
  const storedBookIds = normalizeBookIdList(report?.bookIds)

  if (bookMode === 'single') {
    return resolveReportSpecificBookIds(report)
  }

  if (bookMode === 'all') {
    return storedBookIds
  }

  return storedBookIds
}

export function resolveReportExcludedBookIds(report, books = []) {
  if (resolveReportBookMode(report) !== 'exclude') return []
  const savedBookIds = new Set(resolveReportSavedBookIds(report, books))
  return resolveAvailableBookIds(books).filter((bookId) => !savedBookIds.has(bookId))
}

export function normalizeReportPayload(payload, books = [], options = {}) {
  const bookMode = resolveReportBookMode(payload)
  const availableBookIds = resolveAvailableBookIds(books)
  const inputBookIds = normalizeBookIdList(payload?.bookIds)
  const bookIdsAreSaved = options.bookIdsAreSaved === true
  const specificBookIds = bookMode === 'single' ? resolveReportSpecificBookIds(payload) : []
  const savedBookIds =
    bookMode === 'single'
      ? specificBookIds
      : bookMode === 'all'
        ? bookIdsAreSaved
          ? inputBookIds
          : availableBookIds
        : bookIdsAreSaved
          ? inputBookIds
          : availableBookIds.filter((bookId) => !inputBookIds.includes(bookId))
  const normalized = {
    schoolId: normalizeText(payload?.schoolId),
    bookMode,
    bookId: bookMode === 'single' ? specificBookIds[0] || '' : '',
    bookIds: savedBookIds,
    promoterId: normalizeText(payload?.promoterId),
    term: normalizeTermText(payload?.term),
    note: normalizeText(payload?.note),
  }

  if (normalized.bookMode === 'all' && !normalized.note) {
    normalized.note = DEFAULT_ALL_BOOKS_NOTE
  }

  if (normalized.bookMode === 'exclude' && !normalized.note) {
    normalized.note = DEFAULT_EXCLUDE_BOOKS_NOTE
  }

  return normalized
}

export function hasReportConflict(report, normalized, currentId = '', books = []) {
  if (report?.id === currentId) return false
  if (report?.schoolId !== normalized.schoolId) return false
  if (resolveReportTerm(report) !== normalized.term) return false

  const normalizedBookIds = resolveReportSavedBookIds(normalized, books)
  const reportBookIds = resolveReportSavedBookIds(report, books)
  return normalizedBookIds.some((bookId) => reportBookIds.includes(bookId))
}

export function findReportConflicts(reports = [], normalized, currentId = '', books = []) {
  const normalizedBookIds = resolveReportSavedBookIds(normalized, books)

  return reports
    .filter((report) => {
      if (report?.id === currentId) return false
      if (report?.schoolId !== normalized.schoolId) return false
      return resolveReportTerm(report) === normalized.term
    })
    .map((report) => {
      const reportBookIdSet = new Set(resolveReportSavedBookIds(report, books))
      return {
        report,
        bookIds: normalizedBookIds.filter((bookId) => reportBookIdSet.has(bookId)),
      }
    })
    .filter((item) => item.bookIds.length)
}

export function reportMatchesBook(report, bookId) {
  const savedBookIds = resolveReportSavedBookIds(report)
  return savedBookIds.includes(bookId)
}
