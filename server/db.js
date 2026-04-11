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
    return {
      schools: Array.isArray(parsed.schools) ? parsed.schools : [],
      books: Array.isArray(parsed.books) ? parsed.books : [],
      promoters: Array.isArray(parsed.promoters) ? parsed.promoters : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    }
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
