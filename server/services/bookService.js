import { createId, normalizeText } from '../db.js'

export function upsertBook(db, payload) {
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

export function updateBook(db, id, payload) {
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
