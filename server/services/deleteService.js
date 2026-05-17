import { resolveReportSavedBookIds } from '../../shared/reportRules.js'

export function getRowsByKind(db, kind) {
  if (kind === 'schools') return db.schools
  if (kind === 'books') return db.books
  if (kind === 'promoters') return db.promoters
  if (kind === 'reports') return db.reports
  throw new Error('不支持的批量操作类型。')
}

export function deleteByKind(db, kind, ids) {
  const idSet = new Set(ids)

  if (kind === 'schools') {
    db.schools = db.schools.filter((item) => !idSet.has(item.id))
    db.reports = db.reports.filter((item) => !idSet.has(item.schoolId))
    return
  }

  if (kind === 'books') {
    db.books = db.books.filter((item) => !idSet.has(item.id))
    db.reports = db.reports
      .map((item) => {
        const bookIds = resolveReportSavedBookIds(item).filter((bookId) => !idSet.has(bookId))
        return {
          ...item,
          bookId: item.bookMode === 'single' ? bookIds[0] || '' : '',
          bookIds,
        }
      })
      .filter((item) => item.bookIds.length)
    return
  }

  if (kind === 'promoters') {
    db.promoters = db.promoters.filter((item) => !idSet.has(item.id))
    db.reports = db.reports.filter((item) => !idSet.has(item.promoterId))
    return
  }

  if (kind === 'reports') {
    db.reports = db.reports.filter((item) => !idSet.has(item.id))
    return
  }

  throw new Error('不支持的删除类型。')
}
