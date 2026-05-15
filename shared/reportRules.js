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

export function normalizeReportPayload(payload) {
  const bookMode = resolveReportBookMode(payload)
  const normalized = {
    schoolId: normalizeText(payload?.schoolId),
    bookMode,
    bookId: bookMode === 'single' ? normalizeText(payload?.bookId) : '',
    bookIds:
      bookMode === 'exclude' && Array.isArray(payload?.bookIds)
        ? Array.from(new Set(payload.bookIds.map(normalizeText).filter(Boolean)))
        : [],
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

export function hasReportConflict(report, normalized, currentId = '') {
  const reportBookMode = resolveReportBookMode(report)
  if (report?.id === currentId) return false
  if (report?.schoolId !== normalized.schoolId) return false
  if (resolveReportTerm(report) !== normalized.term) return false

  if (normalized.bookMode === 'single') {
    return reportBookMode === 'single' && report.bookId === normalized.bookId
  }

  return reportBookMode === normalized.bookMode
}

export function reportMatchesBook(report, bookId) {
  const bookMode = resolveReportBookMode(report)
  if (bookMode === 'all') return true
  if (bookMode === 'exclude') return !(report?.bookIds || []).includes(bookId)
  return report?.bookId === bookId
}
