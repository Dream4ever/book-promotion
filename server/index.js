import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { normalizeText } from './db.js'
import { runDbMutation, runDbRead } from './routeHelpers.js'
import { upsertBook, updateBook } from './services/bookService.js'
import { deleteByKind, getRowsByKind } from './services/deleteService.js'
import { upsertPromoter, updatePromoter } from './services/promoterService.js'
import { createReport, updateReport } from './services/reportService.js'
import { upsertSchool, updateSchool } from './services/schoolService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

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
