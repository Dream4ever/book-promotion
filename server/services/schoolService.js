import { createId, normalizeText } from '../db.js'

export function upsertSchool(db, payload) {
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

export function updateSchool(db, id, payload) {
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
