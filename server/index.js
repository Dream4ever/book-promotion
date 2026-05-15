import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createId, normalizeTerritories, normalizeText } from './db.js'
import { runDbMutation, runDbRead } from './routeHelpers.js'
import { hasReportConflict, normalizeReportPayload } from '../shared/reportRules.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

function getRowsByKind(db, kind) {
  if (kind === 'schools') return db.schools
  if (kind === 'books') return db.books
  if (kind === 'promoters') return db.promoters
  if (kind === 'reports') return db.reports
  throw new Error('不支持的批量操作类型。')
}

function deleteByKind(db, kind, ids) {
  const idSet = new Set(ids)

  if (kind === 'schools') {
    db.schools = db.schools.filter((item) => !idSet.has(item.id))
    db.reports = db.reports.filter((item) => !idSet.has(item.schoolId))
    return
  }

  if (kind === 'books') {
    db.books = db.books.filter((item) => !idSet.has(item.id))
    db.reports = db.reports
      .filter((item) => item.bookMode !== 'single' || !idSet.has(item.bookId))
      .map((item) =>
        item.bookMode === 'exclude'
          ? { ...item, bookIds: (item.bookIds || []).filter((bookId) => !idSet.has(bookId)) }
          : item,
      )
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

function upsertSchool(db, payload) {
  const province = normalizeText(payload.province)
  const name = normalizeText(payload.name)
  if (!province || !name) {
    throw new Error('学校数据缺少省份或学校名称。')
  }

  const index = db.schools.findIndex((item) => item.province === province && item.name === name)
  if (index >= 0) {
    db.schools[index] = { ...db.schools[index], province, name }
    return db.schools[index]
  }

  const created = { id: createId('school'), province, name }
  db.schools.unshift(created)
  return created
}

function updateSchool(db, id, payload) {
  const province = normalizeText(payload.province)
  const name = normalizeText(payload.name)
  if (!province || !name) {
    throw new Error('学校数据缺少省份或学校名称。')
  }

  const index = db.schools.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new Error('要修改的学校不存在。')
  }

  const duplicate = db.schools.find(
    (item) => item.id !== id && item.province === province && item.name === name,
  )
  if (duplicate) {
    throw new Error('已存在相同省份和学校名称的学校记录。')
  }

  db.schools[index] = { ...db.schools[index], province, name }
  return db.schools[index]
}

function upsertBook(db, payload) {
  const isbn = normalizeText(payload.isbn)
  const title = normalizeText(payload.title)
  const price = Number(payload.price || 0)
  if (!isbn || !title) {
    throw new Error('书目数据缺少 ISBN 或书名。')
  }

  const index = db.books.findIndex((item) => item.isbn === isbn)
  if (index >= 0) {
    db.books[index] = { ...db.books[index], isbn, title, price }
    return db.books[index]
  }

  const created = { id: createId('book'), isbn, title, price }
  db.books.unshift(created)
  return created
}

function updateBook(db, id, payload) {
  const isbn = normalizeText(payload.isbn)
  const title = normalizeText(payload.title)
  const price = Number(payload.price || 0)
  if (!isbn || !title) {
    throw new Error('书目数据缺少 ISBN 或书名。')
  }

  const index = db.books.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new Error('要修改的书目不存在。')
  }

  const duplicate = db.books.find((item) => item.id !== id && item.isbn === isbn)
  if (duplicate) {
    throw new Error('已存在相同 ISBN 的书目记录。')
  }

  db.books[index] = { ...db.books[index], isbn, title, price }
  return db.books[index]
}

function buildPromoterPayload(payload) {
  const agencyRecords = Array.isArray(payload.agencyRecords)
    ? payload.agencyRecords
        .map((item) => ({
          id: normalizeText(item.id) || createId('agency'),
          year: normalizeText(item.year),
          agencyPeriod: normalizeText(item.agencyPeriod),
          workload: normalizeText(item.workload),
          territories: normalizeTerritories(item.territories),
        }))
        .filter(
          (item) => item.year,
        )
    : []

  return {
    name: normalizeText(payload.name),
    contact: normalizeText(payload.contact),
    phone: normalizeText(payload.phone),
    agencyRecords,
  }
}

function mergeAgencyRecords(existingRecords, nextRecords) {
  const merged = new Map()

  for (const record of existingRecords || []) {
    if (record?.year) {
      merged.set(record.year, record)
    }
  }

  for (const record of nextRecords || []) {
    if (record?.year) {
      merged.set(record.year, record)
    }
  }

  return Array.from(merged.values()).sort((a, b) => Number(b.year) - Number(a.year))
}

function upsertPromoter(db, payload) {
  const normalized = buildPromoterPayload(payload)
  if (!normalized.name) {
    throw new Error('推广商名称不能为空。')
  }

  const index = db.promoters.findIndex(
    (item) => item.name === normalized.name && item.phone === normalized.phone,
  )

  if (index >= 0) {
    db.promoters[index] = {
      ...db.promoters[index],
      ...normalized,
      agencyRecords: mergeAgencyRecords(db.promoters[index].agencyRecords, normalized.agencyRecords),
    }
    return db.promoters[index]
  }

  const created = { id: createId('promoter'), ...normalized }
  db.promoters.unshift(created)
  return created
}

function updatePromoter(db, id, payload) {
  const normalized = buildPromoterPayload(payload)
  if (!normalized.name) {
    throw new Error('推广商名称不能为空。')
  }

  const index = db.promoters.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new Error('要修改的推广商不存在。')
  }

  const duplicate = db.promoters.find(
    (item) => item.id !== id && item.name === normalized.name && item.phone === normalized.phone,
  )
  if (duplicate) {
    throw new Error('已存在相同名称和联系电话的推广商记录。')
  }

  db.promoters[index] = { ...db.promoters[index], ...normalized }
  return db.promoters[index]
}

function ensureReportRefs(db, payload) {
  const school = db.schools.find((item) => item.id === payload.schoolId)
  const promoter = db.promoters.find((item) => item.id === payload.promoterId)

  if (!school || !promoter) {
    throw new Error('报备对象不存在，请刷新后重试。')
  }

  if (payload.bookMode === 'single') {
    const book = db.books.find((item) => item.id === payload.bookId)
    if (!book) {
      throw new Error('报备对象不存在，请刷新后重试。')
    }
  }

  if (payload.bookMode === 'exclude') {
    const bookIdSet = new Set(db.books.map((item) => item.id))
    const invalidBookIds = payload.bookIds.filter((bookId) => !bookIdSet.has(bookId))
    if (invalidBookIds.length) {
      throw new Error('报备对象不存在，请刷新后重试。')
    }
  }
}

function validateReportPayload(normalized) {
  if (!normalized.schoolId || !normalized.promoterId || !normalized.term) {
    throw new Error('学校、推广商、报备学期均为必选项。')
  }

  if (normalized.bookMode === 'single' && !normalized.bookId) {
    throw new Error('请选择要推广的书目。')
  }

  if (normalized.bookMode === 'exclude' && !normalized.bookIds.length) {
    throw new Error('请选择需要排除的书目。')
  }
}

function createReport(db, payload) {
  const normalized = normalizeReportPayload(payload)
  validateReportPayload(normalized)
  ensureReportRefs(db, normalized)

  const existing = db.reports.find((item) => hasReportConflict(item, normalized))
  if (existing) {
    throw new Error('该学校当前学期已存在相同报备规则，不允许重复。')
  }

  const created = {
    id: createId('report'),
    ...normalized,
    createdAt: new Date().toISOString(),
  }
  db.reports.unshift(created)
  return created
}

function updateReport(db, id, payload) {
  const normalized = normalizeReportPayload(payload)
  validateReportPayload(normalized)

  const index = db.reports.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new Error('要修改的报备记录不存在。')
  }

  ensureReportRefs(db, normalized)

  const duplicate = db.reports.find((item) => hasReportConflict(item, normalized, id))
  if (duplicate) {
    throw new Error('该学校当前学期已存在相同报备规则，不允许重复。')
  }

  db.reports[index] = {
    ...db.reports[index],
    ...normalized,
    updatedAt: new Date().toISOString(),
  }
  return db.reports[index]
}

app.get('/api/data', async (_, res) => {
  await runDbRead(res, (db) => db)
})

app.post('/api/schools', async (req, res) => {
  await runDbMutation(res, (db) => upsertSchool(db, req.body))
})

app.put('/api/schools/:id', async (req, res) => {
  await runDbMutation(res, (db) => updateSchool(db, req.params.id, req.body))
})

app.post('/api/books', async (req, res) => {
  await runDbMutation(res, (db) => upsertBook(db, req.body))
})

app.put('/api/books/:id', async (req, res) => {
  await runDbMutation(res, (db) => updateBook(db, req.params.id, req.body))
})

app.post('/api/promoters', async (req, res) => {
  await runDbMutation(res, (db) => upsertPromoter(db, req.body))
})

app.put('/api/promoters/:id', async (req, res) => {
  await runDbMutation(res, (db) => updatePromoter(db, req.params.id, req.body))
})

app.post('/api/reports', async (req, res) => {
  await runDbMutation(res, (db) => createReport(db, req.body))
})

app.put('/api/reports/:id', async (req, res) => {
  await runDbMutation(res, (db) => updateReport(db, req.params.id, req.body))
})

app.post('/api/import/:kind', async (req, res) => {
  await runDbMutation(res, (db) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
    let count = 0

    for (const row of rows) {
      if (req.params.kind === 'schools') {
        upsertSchool(db, row)
        count += 1
      }
      if (req.params.kind === 'books') {
        upsertBook(db, row)
        count += 1
      }
      if (req.params.kind === 'promoters') {
        upsertPromoter(db, row)
        count += 1
      }
    }

    return { count }
  })
})

app.post('/api/batch-delete/:kind', async (req, res) => {
  await runDbMutation(res, (db) => {
    const kind = req.params.kind
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(normalizeText).filter(Boolean) : []
    if (!ids.length) {
      throw new Error('请先选择需要删除的数据。')
    }

    getRowsByKind(db, kind)
    deleteByKind(db, kind, ids)
    return { ok: true, count: ids.length }
  })
})

app.delete('/api/schools/:id', async (req, res) => {
  await runDbMutation(res, (db) => {
    deleteByKind(db, 'schools', [req.params.id])
    return { ok: true }
  })
})

app.delete('/api/books/:id', async (req, res) => {
  await runDbMutation(res, (db) => {
    deleteByKind(db, 'books', [req.params.id])
    return { ok: true }
  })
})

app.delete('/api/promoters/:id', async (req, res) => {
  await runDbMutation(res, (db) => {
    deleteByKind(db, 'promoters', [req.params.id])
    return { ok: true }
  })
})

app.delete('/api/reports/:id', async (req, res) => {
  await runDbMutation(res, (db) => {
    deleteByKind(db, 'reports', [req.params.id])
    return { ok: true }
  })
})

app.use(express.static(path.resolve(__dirname, '../dist')))

app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT}`)
})
