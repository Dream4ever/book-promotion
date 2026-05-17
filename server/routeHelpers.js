import { readDb, writeDb } from './db.js'

let mutationQueue = Promise.resolve()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

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
  const run = mutationQueue.then(async () => {
    const db = await readDb()
    const previous = clone(db)
    const result = await action(db)
    await writeDb(db, { previous })
    res.json(result)
  })
  mutationQueue = run.catch(() => {})

  try {
    await run
  } catch (error) {
    sendError(res, error.message)
  }
}
