import { createId } from '../db.js'
import {
  findReportConflicts,
  normalizeReportPayload,
  resolveReportTerm,
} from '#shared/reportRules.js'

function ensureReportRefs(db, payload) {
  const school = db.schools.find((item) => item.id === payload.schoolId)
  const promoter = db.promoters.find((item) => item.id === payload.promoterId)

  if (!school || !promoter) {
    throw new Error('报备对象不存在，请刷新后重试。')
  }

  const bookIdSet = new Set(db.books.map((item) => item.id))
  const invalidBookIds = payload.bookIds.filter((bookId) => !bookIdSet.has(bookId))
  if (invalidBookIds.length) {
    throw new Error('报备对象不存在，请刷新后重试。')
  }
}

function validateReportPayload(normalized) {
  if (!normalized.schoolId || !normalized.promoterId || !normalized.term) {
    throw new Error('学校、推广商、报备学期均为必选项。')
  }

  if (normalized.bookMode === 'single' && !normalized.bookIds.length) {
    throw new Error('请选择要推广的书目。')
  }

  if (normalized.bookMode === 'all' && !normalized.bookIds.length) {
    throw new Error('当前书目名单为空，无法选择所有书。')
  }

  if (normalized.bookMode === 'exclude' && !normalized.bookIds.length) {
    throw new Error('排除后没有可报备的书目，请至少保留一本图书。')
  }
}

function formatBookLabel(bookId, books) {
  const book = books.find((item) => item.id === bookId)
  if (!book) return '书目已删除'
  return book.isbn ? `${book.title}（${book.isbn}）` : book.title
}

function buildReportConflictMessage(db, conflicts, normalized) {
  const school = db.schools.find((item) => item.id === normalized.schoolId)
  const schoolLabel = school ? `${school.province} / ${school.name}` : '当前学校'
  const lines = conflicts.flatMap(({ report, bookIds }) => {
    const term = resolveReportTerm(report)
    return bookIds.map(
      (bookId) => `- ${formatBookLabel(bookId, db.books)}：已在 ${term}，${schoolLabel} 报备过`,
    )
  })

  return [
    '该学校当前学期已有图书被报备，不允许重复报备同一本书。',
    '重复书目如下：',
    ...lines,
  ].join('\n')
}

export function createReport(db, payload) {
  const normalized = normalizeReportPayload(payload, db.books)
  validateReportPayload(normalized)
  ensureReportRefs(db, normalized)

  const conflicts = findReportConflicts(db.reports, normalized, '', db.books)
  if (conflicts.length) {
    throw new Error(buildReportConflictMessage(db, conflicts, normalized))
  }

  const created = {
    id: createId('report'),
    ...normalized,
    createdAt: new Date().toISOString(),
  }
  db.reports.unshift(created)
  return created
}

export function updateReport(db, id, payload) {
  const normalized = normalizeReportPayload(payload, db.books)
  validateReportPayload(normalized)

  const index = db.reports.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new Error('要修改的报备记录不存在。')
  }

  ensureReportRefs(db, normalized)

  const conflicts = findReportConflicts(db.reports, normalized, id, db.books)
  if (conflicts.length) {
    throw new Error(buildReportConflictMessage(db, conflicts, normalized))
  }

  db.reports[index] = {
    ...db.reports[index],
    ...normalized,
    updatedAt: new Date().toISOString(),
  }
  return db.reports[index]
}
