export function cloneTerritories(territories = []) {
  return territories.map((territory) => ({ ...territory }))
}

export function cloneAgencyRecords(records = []) {
  return records.map((record) => ({
    ...record,
    territories: cloneTerritories(record.territories || []),
  }))
}

export function normalizeAgencyRecords(promoter) {
  return Array.isArray(promoter?.agencyRecords) ? cloneAgencyRecords(promoter.agencyRecords) : []
}

export function formatTerritoryText(territories) {
  if (!territories?.length) return '未配置'
  return territories
    .map((item) => `${item.province}(${item.accepting ? '接单' : '不接单'})`)
    .join('、')
}

export function formatAgencyRecordsText(records) {
  if (!records?.length) return '未配置'
  return records
    .map(
      (item) =>
        `${item.year}年: ${formatTerritoryText(item.territories)} / ${item.agencyPeriod || '-'} / ${item.workload || '-'}`,
    )
    .join('；')
}

export function latestAgencyRecord(records) {
  if (!records?.length) return null
  return [...records].sort((a, b) => Number(b.year) - Number(a.year))[0]
}
