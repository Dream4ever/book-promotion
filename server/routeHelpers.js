import { readDb, writeDb } from './db.js'

export function sendError(res, message, status = 400) {
  res.status(status).json({ message })
}

export async function runDbRead(res, action) {
  try {
    const db = await readDb()
    res.json(await action(db))
  } catch (error) {
    sendError(res, error.message)
  }
}

export async function runDbMutation(res, action) {
  try {
    const db = await readDb()
    const result = await action(db)
    await writeDb(db)
    res.json(result)
  } catch (error) {
    sendError(res, error.message)
  }
}
