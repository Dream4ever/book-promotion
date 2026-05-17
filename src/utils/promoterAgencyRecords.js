const DEFAULT_CURRENT_YEAR = new Date().getFullYear()

export function cloneTerritories(territories = []) {
  return territories.map((territory) => ({ ...territory }))
}

export function cloneAgencyRecords(records = []) {
  return records.map((record) => ({
    ...record,
    territories: cloneTerritories(record.territories || []),
  }))
}

export function normalizeAgencyRecords(promoter, { currentYear = DEFAULT_CURRENT_YEAR } = {}) {
  if (Array.isArray(promoter?.agencyRecords) && promoter.agencyRecords.length) {
    return cloneAgencyRecords(promoter.agencyRecords)
  }

  const legacyTerritories = Array.isArray(promoter?.territories) ? promoter.territories : []
  const hasLegacyAgencyData =
    promoter?.agencyYear ||
    promoter?.agencyPeriod ||
    promoter?.workload ||
    legacyTerritories.length

  if (!hasLegacyAgencyData) return []

  return [
    {
      id: promoter?.id ? `${promoter.id}_legacy` : `legacy_${currentYear}`,
      year: String(promoter?.agencyYear || currentYear),
      agencyPeriod: promoter?.agencyPeriod || '',
      workload: promoter?.workload || '',
      territories: cloneTerritories(legacyTerritories),
    },
  ]
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
