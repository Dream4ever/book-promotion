export function mapSchoolRow(row) {
  return {
    id: row.id,
    province: row.province || '',
    name: row.name || '',
  }
}

export function mapBookRow(row) {
  return {
    id: row.id,
    isbn: row.isbn || '',
    title: row.title || '',
    price: Number(row.price || 0),
  }
}

export function mapPromoterRow(row, recordsByPromoterId) {
  return {
    id: row.id,
    name: row.name || '',
    contact: row.contact || '',
    phone: row.phone || '',
    agencyRecords: recordsByPromoterId.get(row.id) || [],
  }
}

export function mapAgencyRecordRow(row, territoriesByRecordId) {
  return {
    id: row.id,
    year: row.year || '',
    agencyPeriod: row.agency_period || '',
    workload: row.workload || '',
    territories: territoriesByRecordId.get(row.id) || [],
  }
}

export function mapReportRow(row, bookIdsByReportId) {
  const bookIds = bookIdsByReportId.get(row.id) || []
  return {
    id: row.id,
    schoolId: row.school_id || '',
    bookMode: row.book_mode || 'single',
    bookId: row.book_id || '',
    bookIds,
    promoterId: row.promoter_id || '',
    term: row.term || '',
    note: row.note || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  }
}

export function groupBy(items, key) {
  const grouped = new Map()
  for (const item of items) {
    const value = item[key]
    if (!grouped.has(value)) grouped.set(value, [])
    grouped.get(value).push(item)
  }
  return grouped
}

export function orderRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const sortOrder = Number(a.sort_order || 0) - Number(b.sort_order || 0)
    if (sortOrder !== 0) return sortOrder
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}

export function buildSchoolRows(schools) {
  return schools.map((school, index) => ({
    id: school.id,
    province: school.province,
    name: school.name,
    sort_order: index,
  }))
}

export function buildBookRows(books) {
  return books.map((book, index) => ({
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    price: book.price,
    sort_order: index,
  }))
}

export function buildPromoterRows(promoters) {
  return promoters.map((promoter, index) => ({
    id: promoter.id,
    name: promoter.name,
    contact: promoter.contact,
    phone: promoter.phone,
    sort_order: index,
  }))
}

export function buildAgencyRecordRows(promoters) {
  return promoters.flatMap((promoter) =>
    promoter.agencyRecords.map((record, index) => ({
      id: record.id,
      promoter_id: promoter.id,
      year: record.year,
      agency_period: record.agencyPeriod,
      workload: record.workload,
      sort_order: index,
    })),
  )
}

export function buildTerritoryRows(promoters) {
  return promoters.flatMap((promoter) =>
    promoter.agencyRecords.flatMap((record) =>
      record.territories.map((territory, index) => ({
        agency_record_id: record.id,
        province: territory.province,
        accepting: territory.accepting,
        sort_order: index,
      })),
    ),
  )
}

export function buildReportRows(reports) {
  return reports.map((report, index) => ({
    id: report.id,
    school_id: report.schoolId,
    book_mode: report.bookMode,
    book_id: report.bookId,
    promoter_id: report.promoterId,
    term: report.term,
    note: report.note,
    created_at: report.createdAt || new Date().toISOString(),
    updated_at: report.updatedAt || null,
    sort_order: index,
  }))
}

export function buildReportBookRows(reports) {
  return reports.flatMap((report) =>
    report.bookIds.map((bookId, index) => ({
      report_id: report.id,
      book_id: bookId,
      sort_order: index,
    })),
  )
}

export function pickByIds(rows, ids) {
  const idSet = new Set(ids)
  return rows.filter((row) => idSet.has(row.id))
}
