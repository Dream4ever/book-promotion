import { createId, normalizeTerritories, normalizeText } from '../db.js'

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
        .filter((item) => item.year)
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

export function upsertPromoter(db, payload) {
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

export function updatePromoter(db, id, payload) {
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
