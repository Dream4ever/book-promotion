import { getMethod, readBody, setResponseStatus } from 'h3'
import { normalizeText, readDb, writeDb } from '../db.js'
import { upsertBook, updateBook } from '../services/bookService.js'
import { deleteByKind, getRowsByKind } from '../services/deleteService.js'
import { upsertPromoter, updatePromoter } from '../services/promoterService.js'
import { createReport, updateReport } from '../services/reportService.js'
import { upsertSchool, updateSchool } from '../services/schoolService.js'

let mutationQueue = Promise.resolve()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getPathSegments(event) {
  const path = event.context.params?.path
  if (Array.isArray(path)) return path
  return String(path || '').split('/').filter(Boolean)
}

async function getJsonBody(event) {
  return (await readBody(event).catch(() => null)) || {}
}

async function runDbRead(action) {
  const db = await readDb()
  return action(db)
}

async function runDbMutation(action) {
  const run = mutationQueue.then(async () => {
    const db = await readDb()
    const previous = clone(db)
    const result = await action(db)
    await writeDb(db, { previous })
    return result
  })
  mutationQueue = run.catch(() => {})
  return run
}

async function importRows(kind, body) {
  return runDbMutation((db) => {
    const rows = Array.isArray(body?.rows) ? body.rows : []
    let count = 0

    for (const row of rows) {
      if (kind === 'schools') {
        upsertSchool(db, row)
        count += 1
      }
      if (kind === 'books') {
        upsertBook(db, row)
        count += 1
      }
      if (kind === 'promoters') {
        upsertPromoter(db, row)
        count += 1
      }
    }

    return { count }
  })
}

async function batchDelete(kind, body) {
  return runDbMutation((db) => {
    const ids = Array.isArray(body?.ids) ? body.ids.map(normalizeText).filter(Boolean) : []
    if (!ids.length) {
      throw new Error('璇峰厛閫夋嫨闇€瑕佸垹闄ょ殑鏁版嵁銆?')
    }

    getRowsByKind(db, kind)
    deleteByKind(db, kind, ids)
    return { ok: true, count: ids.length }
  })
}

async function dispatch(event) {
  const method = getMethod(event)
  const [resource, id] = getPathSegments(event)
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await getJsonBody(event) : null

  if (method === 'GET' && resource === 'data' && !id) {
    return runDbRead((db) => db)
  }

  if (method === 'POST' && resource === 'schools' && !id) {
    return runDbMutation((db) => upsertSchool(db, body))
  }
  if (method === 'PUT' && resource === 'schools' && id) {
    return runDbMutation((db) => updateSchool(db, id, body))
  }
  if (method === 'DELETE' && resource === 'schools' && id) {
    return runDbMutation((db) => {
      deleteByKind(db, 'schools', [id])
      return { ok: true }
    })
  }

  if (method === 'POST' && resource === 'books' && !id) {
    return runDbMutation((db) => upsertBook(db, body))
  }
  if (method === 'PUT' && resource === 'books' && id) {
    return runDbMutation((db) => updateBook(db, id, body))
  }
  if (method === 'DELETE' && resource === 'books' && id) {
    return runDbMutation((db) => {
      deleteByKind(db, 'books', [id])
      return { ok: true }
    })
  }

  if (method === 'POST' && resource === 'promoters' && !id) {
    return runDbMutation((db) => upsertPromoter(db, body))
  }
  if (method === 'PUT' && resource === 'promoters' && id) {
    return runDbMutation((db) => updatePromoter(db, id, body))
  }
  if (method === 'DELETE' && resource === 'promoters' && id) {
    return runDbMutation((db) => {
      deleteByKind(db, 'promoters', [id])
      return { ok: true }
    })
  }

  if (method === 'POST' && resource === 'reports' && !id) {
    return runDbMutation((db) => createReport(db, body))
  }
  if (method === 'PUT' && resource === 'reports' && id) {
    return runDbMutation((db) => updateReport(db, id, body))
  }
  if (method === 'DELETE' && resource === 'reports' && id) {
    return runDbMutation((db) => {
      deleteByKind(db, 'reports', [id])
      return { ok: true }
    })
  }

  if (method === 'POST' && resource === 'import' && id) {
    return importRows(id, body)
  }

  if (method === 'POST' && resource === 'batch-delete' && id) {
    return batchDelete(id, body)
  }

  setResponseStatus(event, 404)
  return { message: 'API route not found' }
}

export default defineEventHandler(async (event) => {
  try {
    return await dispatch(event)
  } catch (error) {
    setResponseStatus(event, error?.statusCode || 400)
    return { message: error?.message || '璇锋眰澶辫触' }
  }
})
