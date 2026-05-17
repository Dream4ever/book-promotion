import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { inferReportTerm, normalizeReportPayload } from '../shared/reportRules.js'

const DEFAULT_DB = {
  schools: [],
  books: [],
  promoters: [],
  reports: [],
}

const DEFAULT_STATE_TABLE = 'app_state'
const DEFAULT_STATE_ID = 'school_promo_registry'

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

function getStateTable() {
  return process.env.SUPABASE_STATE_TABLE?.trim() || DEFAULT_STATE_TABLE
}

function getStateId() {
  return process.env.SUPABASE_STATE_ID?.trim() || DEFAULT_STATE_ID
}

function normalizeDb(value) {
  const parsed = value && typeof value === 'object' ? value : DEFAULT_DB
  const books = Array.isArray(parsed.books) ? parsed.books : []

  return {
    schools: Array.isArray(parsed.schools) ? parsed.schools : [],
    books,
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
      term: normalizeText(report?.term) || inferReportTerm(report?.createdAt),
    },
    books,
    { bookIdsAreSaved: true },
  )

  return {
    ...report,
    id: report?.id || createId('report'),
    ...normalized,
  }
}

export async function readDb() {
  const table = getStateTable()
  const id = getStateId()
  const { data, error } = await getSupabase()
    .from(table)
    .select('data')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read Supabase state: ${error.message}`)
  }

  const rawData = data?.data ?? clone(DEFAULT_DB)
  const normalized = normalizeDb(rawData)

  if (!data || JSON.stringify(rawData) !== JSON.stringify(normalized)) {
    await writeDb(normalized)
  }

  return normalized
}

export async function writeDb(data) {
  const normalized = normalizeDb(data)
  const { error } = await getSupabase()
    .from(getStateTable())
    .upsert(
      {
        id: getStateId(),
        data: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) {
    throw new Error(`Failed to write Supabase state: ${error.message}`)
  }
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
