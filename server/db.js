import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { inferReportTerm, normalizeReportPayload } from '../shared/reportRules.js'

const DEFAULT_DB = {
  schools: [],
  books: [],
  promoters: [],
  reports: [],
}

const DEFAULT_TABLES = {
  schools: 'schools',
  books: 'books',
  promoters: 'promoters',
  promoterAgencyRecords: 'promoter_agency_records',
  promoterTerritories: 'promoter_territories',
  reports: 'reports',
  reportBooks: 'report_books',
}

const LEGACY_STATE_TABLE = 'app_state'
const LEGACY_STATE_ID = 'school_promo_registry'

let supabaseClient

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
  }

  return supabaseClient
}

function getTable(envName, defaultName) {
  return process.env[envName]?.trim() || defaultName
}

function getTables() {
  return {
    schools: getTable('SUPABASE_SCHOOLS_TABLE', DEFAULT_TABLES.schools),
    books: getTable('SUPABASE_BOOKS_TABLE', DEFAULT_TABLES.books),
    promoters: getTable('SUPABASE_PROMOTERS_TABLE', DEFAULT_TABLES.promoters),
    promoterAgencyRecords: getTable(
      'SUPABASE_PROMOTER_AGENCY_RECORDS_TABLE',
      DEFAULT_TABLES.promoterAgencyRecords,
    ),
    promoterTerritories: getTable(
      'SUPABASE_PROMOTER_TERRITORIES_TABLE',
      DEFAULT_TABLES.promoterTerritories,
    ),
    reports: getTable('SUPABASE_REPORTS_TABLE', DEFAULT_TABLES.reports),
    reportBooks: getTable('SUPABASE_REPORT_BOOKS_TABLE', DEFAULT_TABLES.reportBooks),
  }
}

function getLegacyStateTable() {
  return process.env.SUPABASE_STATE_TABLE?.trim() || LEGACY_STATE_TABLE
}

function getLegacyStateId() {
  return process.env.SUPABASE_STATE_ID?.trim() || LEGACY_STATE_ID
}

function normalizeDb(value) {
  const parsed = value && typeof value === 'object' ? value : DEFAULT_DB
  const books = Array.isArray(parsed.books) ? parsed.books : []

  return {
    schools: Array.isArray(parsed.schools) ? parsed.schools.map(normalizeSchool) : [],
    books: books.map(normalizeBook),
    promoters: Array.isArray(parsed.promoters) ? parsed.promoters.map(normalizePromoter) : [],
    reports: Array.isArray(parsed.reports)
      ? parsed.reports.map((report) => normalizeReport(report, books))
      : [],
  }
}

function normalizeYear(value) {
  const text = String(value ?? '').trim()
  if (!text) return String(new Date().getFullYear())
  return text.replace(/[^\d]/g, '').slice(0, 4) || String(new Date().getFullYear())
}

function normalizeSchool(school) {
  return {
    id: school?.id || createId('school'),
    province: normalizeText(school?.province),
    name: normalizeText(school?.name),
  }
}

function normalizeBook(book) {
  return {
    id: book?.id || createId('book'),
    isbn: normalizeText(book?.isbn),
    title: normalizeText(book?.title),
    price: Number(book?.price || 0),
  }
}

function normalizePromoterRecord(record) {
  const territories = normalizeTerritories(record?.territories)
  return {
    id: record?.id || createId('agency'),
    year: normalizeYear(record?.year || record?.agencyYear),
    agencyPeriod: normalizeText(record?.agencyPeriod),
    workload: normalizeText(record?.workload),
    territories,
  }
}

function normalizePromoter(promoter) {
  const hasLegacyAgencyData =
    normalizeText(promoter?.agencyYear) ||
    normalizeText(promoter?.agencyPeriod) ||
    normalizeText(promoter?.workload) ||
    normalizeTerritories(promoter?.territories).length

  const agencyRecords = Array.isArray(promoter?.agencyRecords) && promoter.agencyRecords.length
    ? promoter.agencyRecords.map(normalizePromoterRecord)
    : hasLegacyAgencyData
      ? [
          normalizePromoterRecord({
            year: promoter?.agencyYear || new Date().getFullYear(),
            agencyPeriod: promoter?.agencyPeriod,
            workload: promoter?.workload,
            territories: promoter?.territories,
          }),
        ]
      : []

  return {
    id: promoter?.id || createId('promoter'),
    name: normalizeText(promoter?.name),
    contact: normalizeText(promoter?.contact),
    phone: normalizeText(promoter?.phone),
    agencyRecords,
  }
}

function normalizeReport(report, books) {
  const normalized = normalizeReportPayload(
    {
      ...report,
      term: normalizeText(report?.term) || inferReportTerm(report?.createdAt || report?.created_at),
    },
    books,
    { bookIdsAreSaved: true },
  )

  return {
    ...report,
    id: report?.id || createId('report'),
    ...normalized,
    createdAt: normalizeText(report?.createdAt || report?.created_at),
    updatedAt: normalizeText(report?.updatedAt || report?.updated_at),
  }
}

function mapSchoolRow(row) {
  return {
    id: row.id,
    province: row.province || '',
    name: row.name || '',
  }
}

function mapBookRow(row) {
  return {
    id: row.id,
    isbn: row.isbn || '',
    title: row.title || '',
    price: Number(row.price || 0),
  }
}

function mapPromoterRow(row, recordsByPromoterId) {
  return {
    id: row.id,
    name: row.name || '',
    contact: row.contact || '',
    phone: row.phone || '',
    agencyRecords: recordsByPromoterId.get(row.id) || [],
  }
}

function mapAgencyRecordRow(row, territoriesByRecordId) {
  return {
    id: row.id,
    year: row.year || '',
    agencyPeriod: row.agency_period || '',
    workload: row.workload || '',
    territories: territoriesByRecordId.get(row.id) || [],
  }
}

function mapReportRow(row, bookIdsByReportId) {
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

function groupBy(items, key) {
  const grouped = new Map()
  for (const item of items) {
    const value = item[key]
    if (!grouped.has(value)) grouped.set(value, [])
    grouped.get(value).push(item)
  }
  return grouped
}

function orderRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const sortOrder = Number(a.sort_order || 0) - Number(b.sort_order || 0)
    if (sortOrder !== 0) return sortOrder
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}

function assertNoError(error, message) {
  if (error) {
    throw new Error(`${message}: ${error.message}`)
  }
}

async function selectTable(table, columns = '*') {
  const { data, error } = await getSupabase().from(table).select(columns)
  assertNoError(error, `Failed to read Supabase table ${table}`)
  return data || []
}

async function clearTable(table, column = 'id') {
  const { error } = await getSupabase().from(table).delete().neq(column, '__never_delete__')
  assertNoError(error, `Failed to clear Supabase table ${table}`)
}

async function insertRows(table, rows) {
  if (!rows.length) return
  const { error } = await getSupabase().from(table).insert(rows)
  assertNoError(error, `Failed to write Supabase table ${table}`)
}

async function upsertRows(table, rows, onConflict = 'id') {
  if (!rows.length) return
  const { error } = await getSupabase().from(table).upsert(rows, { onConflict })
  assertNoError(error, `Failed to upsert Supabase table ${table}`)
}

async function deleteRows(table, column, values) {
  const ids = [...new Set(values)].filter(Boolean)
  if (!ids.length) return
  const { error } = await getSupabase().from(table).delete().in(column, ids)
  assertNoError(error, `Failed to delete from Supabase table ${table}`)
}

function getWriteRpcName() {
  return process.env.SUPABASE_WRITE_RPC?.trim()
}

async function writeDbViaRpc(normalized, previous) {
  const rpcName = getWriteRpcName()
  if (!rpcName) return false

  const { error } = await getSupabase().rpc(rpcName, {
    next_state: normalized,
    previous_state: previous || null,
  })
  assertNoError(error, `Failed to write Supabase data through RPC ${rpcName}`)
  return true
}

async function readLegacyState() {
  const { data, error } = await getSupabase()
    .from(getLegacyStateTable())
    .select('data')
    .eq('id', getLegacyStateId())
    .maybeSingle()

  if (error) return null
  return data?.data || null
}

async function readStructuredDb() {
  const tables = getTables()
  const [
    schoolRows,
    bookRows,
    promoterRows,
    agencyRecordRows,
    territoryRows,
    reportRows,
    reportBookRows,
  ] = await Promise.all([
    selectTable(tables.schools),
    selectTable(tables.books),
    selectTable(tables.promoters),
    selectTable(tables.promoterAgencyRecords),
    selectTable(tables.promoterTerritories),
    selectTable(tables.reports),
    selectTable(tables.reportBooks),
  ])

  const territoriesByRecordId = groupBy(orderRows(territoryRows), 'agency_record_id')
  for (const [recordId, territories] of territoriesByRecordId) {
    territoriesByRecordId.set(
      recordId,
      territories.map((row) => ({
        province: row.province || '',
        accepting: Boolean(row.accepting),
      })),
    )
  }

  const recordsByPromoterId = new Map()
  for (const row of orderRows(agencyRecordRows)) {
    const record = mapAgencyRecordRow(row, territoriesByRecordId)
    if (!recordsByPromoterId.has(row.promoter_id)) recordsByPromoterId.set(row.promoter_id, [])
    recordsByPromoterId.get(row.promoter_id).push(record)
  }

  const bookIdsByReportId = groupBy(orderRows(reportBookRows), 'report_id')
  for (const [reportId, rows] of bookIdsByReportId) {
    bookIdsByReportId.set(
      reportId,
      rows.map((row) => row.book_id).filter(Boolean),
    )
  }

  const schools = orderRows(schoolRows).map(mapSchoolRow)
  const books = orderRows(bookRows).map(mapBookRow)
  const promoters = orderRows(promoterRows).map((row) => mapPromoterRow(row, recordsByPromoterId))
  const reports = orderRows(reportRows).map((row) => mapReportRow(row, bookIdsByReportId))

  return normalizeDb({ schools, books, promoters, reports })
}

function hasAnyData(db) {
  return Boolean(
    db.schools.length ||
      db.books.length ||
      db.promoters.length ||
      db.reports.length,
  )
}

function mapById(rows) {
  return new Map((rows || []).map((row) => [row.id, row]))
}

function isChanged(previous, next) {
  return JSON.stringify(previous || null) !== JSON.stringify(next || null)
}

function diffById(previousRows, nextRows) {
  const previousById = mapById(previousRows)
  const nextById = mapById(nextRows)
  const changed = []
  const removedIds = []

  for (const [id, next] of nextById) {
    if (!previousById.has(id) || isChanged(previousById.get(id), next)) {
      changed.push(next)
    }
  }

  for (const [id] of previousById) {
    if (!nextById.has(id)) {
      removedIds.push(id)
    }
  }

  return { changed, removedIds }
}

function buildSchoolRows(schools) {
  return schools.map((school, index) => ({
    id: school.id,
    province: school.province,
    name: school.name,
    sort_order: index,
  }))
}

function buildBookRows(books) {
  return books.map((book, index) => ({
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    price: book.price,
    sort_order: index,
  }))
}

function buildPromoterRows(promoters) {
  return promoters.map((promoter, index) => ({
    id: promoter.id,
    name: promoter.name,
    contact: promoter.contact,
    phone: promoter.phone,
    sort_order: index,
  }))
}

function buildAgencyRecordRows(promoters) {
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

function buildTerritoryRows(promoters) {
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

function buildReportRows(reports) {
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

function buildReportBookRows(reports) {
  return reports.flatMap((report) =>
    report.bookIds.map((bookId, index) => ({
      report_id: report.id,
      book_id: bookId,
      sort_order: index,
    })),
  )
}

function pickByIds(rows, ids) {
  const idSet = new Set(ids)
  return rows.filter((row) => idSet.has(row.id))
}

export async function readDb() {
  const db = await readStructuredDb()
  if (hasAnyData(db)) return db

  return clone(DEFAULT_DB)
}

export async function migrateLegacyState({ force = false } = {}) {
  const legacyState = await readLegacyState()
  if (!legacyState) {
    return { migrated: false, reason: 'legacy_state_missing', count: 0 }
  }

  const current = await readStructuredDb()
  if (hasAnyData(current) && !force) {
    return { migrated: false, reason: 'structured_tables_not_empty', count: 0 }
  }

  const migrated = normalizeDb(legacyState)
  if (!hasAnyData(migrated)) {
    return { migrated: false, reason: 'legacy_state_empty', count: 0 }
  }

  await replaceDb(migrated)
  return {
    migrated: true,
    count:
      migrated.schools.length +
      migrated.books.length +
      migrated.promoters.length +
      migrated.reports.length,
  }
}

export async function replaceDb(data) {
  const normalized = normalizeDb(data)
  const tables = getTables()

  if (await writeDbViaRpc(normalized, null)) return

  await clearTable(tables.reportBooks, 'report_id')
  await clearTable(tables.reports)
  await clearTable(tables.promoterTerritories, 'agency_record_id')
  await clearTable(tables.promoterAgencyRecords)
  await clearTable(tables.promoters)
  await clearTable(tables.books)
  await clearTable(tables.schools)

  await insertRows(tables.schools, buildSchoolRows(normalized.schools))
  await insertRows(tables.books, buildBookRows(normalized.books))
  await insertRows(tables.promoters, buildPromoterRows(normalized.promoters))
  await insertRows(tables.promoterAgencyRecords, buildAgencyRecordRows(normalized.promoters))
  await insertRows(tables.promoterTerritories, buildTerritoryRows(normalized.promoters))
  await insertRows(tables.reports, buildReportRows(normalized.reports))
  await insertRows(tables.reportBooks, buildReportBookRows(normalized.reports))
}

export async function writeDb(data, { previous = DEFAULT_DB } = {}) {
  const normalized = normalizeDb(data)
  const previousNormalized = normalizeDb(previous)
  const tables = getTables()

  if (await writeDbViaRpc(normalized, previousNormalized)) return

  const schoolDiff = diffById(previousNormalized.schools, normalized.schools)
  const bookDiff = diffById(previousNormalized.books, normalized.books)
  const promoterDiff = diffById(previousNormalized.promoters, normalized.promoters)
  const reportDiff = diffById(previousNormalized.reports, normalized.reports)

  const changedPromoterIds = promoterDiff.changed.map((item) => item.id)
  const changedReportIds = reportDiff.changed.map((item) => item.id)

  await deleteRows(tables.reportBooks, 'report_id', [
    ...reportDiff.removedIds,
    ...changedReportIds,
  ])
  await deleteRows(tables.reports, 'id', reportDiff.removedIds)

  await deleteRows(tables.promoterAgencyRecords, 'promoter_id', [
    ...promoterDiff.removedIds,
    ...changedPromoterIds,
  ])
  await deleteRows(tables.promoters, 'id', promoterDiff.removedIds)
  await deleteRows(tables.books, 'id', bookDiff.removedIds)
  await deleteRows(tables.schools, 'id', schoolDiff.removedIds)

  if (schoolDiff.changed.length || schoolDiff.removedIds.length) {
    await upsertRows(tables.schools, buildSchoolRows(normalized.schools))
  }
  if (bookDiff.changed.length || bookDiff.removedIds.length) {
    await upsertRows(tables.books, buildBookRows(normalized.books))
  }
  if (promoterDiff.changed.length || promoterDiff.removedIds.length) {
    await upsertRows(tables.promoters, buildPromoterRows(normalized.promoters))
  }

  const changedPromoters = pickByIds(normalized.promoters, changedPromoterIds)
  await insertRows(tables.promoterAgencyRecords, buildAgencyRecordRows(changedPromoters))
  await insertRows(tables.promoterTerritories, buildTerritoryRows(changedPromoters))

  if (reportDiff.changed.length || reportDiff.removedIds.length) {
    await upsertRows(tables.reports, buildReportRows(normalized.reports))
  }

  const changedReports = pickByIds(normalized.reports, changedReportIds)
  await insertRows(tables.reportBooks, buildReportBookRows(changedReports))
}

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeText(value) {
  return String(value ?? '').trim()
}

export function normalizeTerritories(territories) {
  return (territories || [])
    .map((item) => ({
      province: normalizeText(item.province),
      accepting: Boolean(item.accepting),
    }))
    .filter((item) => item.province)
}
