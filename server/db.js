import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = path.resolve(__dirname, '../data/db.json')

const DEFAULT_DB = {
  schools: [],
  books: [],
  promoters: [],
  reports: [],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeYear(value) {
  const text = String(value ?? '').trim()
  if (!text) return String(new Date().getFullYear())
  return text.replace(/[^\d]/g, '').slice(0, 4) || String(new Date().getFullYear())
}

function inferTerm(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date()
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear()
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1
  return `${year}年${month >= 8 ? '秋' : '春'}`
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

function normalizeReport(report) {
  const bookMode = ['single', 'all', 'exclude'].includes(report?.bookMode)
    ? report.bookMode
    : 'single'
  const bookIds = Array.isArray(report?.bookIds)
    ? report.bookIds.map(normalizeText).filter(Boolean)
    : []

  return {
    ...report,
    id: report?.id || createId('report'),
    schoolId: normalizeText(report?.schoolId),
    bookMode,
    bookId: bookMode === 'single' ? normalizeText(report?.bookId) : '',
    bookIds: bookMode === 'exclude' ? Array.from(new Set(bookIds)) : [],
    promoterId: normalizeText(report?.promoterId),
    note: normalizeText(report?.note),
    term: normalizeText(report?.term) || inferTerm(report?.createdAt),
  }
}

async function ensureDbFile() {
  try {
    await fs.access(DB_FILE)
  } catch {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true })
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8')
  }
}

export async function readDb() {
  await ensureDbFile()
  const raw = await fs.readFile(DB_FILE, 'utf-8')
  try {
    const parsed = JSON.parse(raw)
    const normalized = {
      schools: Array.isArray(parsed.schools) ? parsed.schools : [],
      books: Array.isArray(parsed.books) ? parsed.books : [],
      promoters: Array.isArray(parsed.promoters) ? parsed.promoters.map(normalizePromoter) : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports.map(normalizeReport) : [],
    }
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2), 'utf-8')
    }
    return normalized
  } catch {
    return clone(DEFAULT_DB)
  }
}

export async function writeDb(data) {
  await ensureDbFile()
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
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
