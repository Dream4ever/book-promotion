import {
  formatAgencyRecordsText,
  formatTerritoryText,
  latestAgencyRecord,
  normalizeAgencyRecords,
} from './promoterAgencyRecords'

export function formatLatestAgencyRecord(record) {
  if (!record) return '-'
  return `${formatTerritoryText(record.territories)} / ${record.agencyPeriod || '-'} / ${record.workload || '-'}`
}

export function buildPromoterViewModel(promoter) {
  const agencyRecords = normalizeAgencyRecords(promoter)
  const latestRecord = latestAgencyRecord(agencyRecords)

  return {
    ...promoter,
    agencyRecords,
    agencyRecordCount: agencyRecords.length,
    latestAgencyYear: latestRecord?.year || '-',
    latestAgencyText: formatLatestAgencyRecord(latestRecord),
    agencyRecordsText: formatAgencyRecordsText(agencyRecords),
    searchText:
      `${promoter.name || ''} ${promoter.contact || ''} ${promoter.phone || ''} ${formatAgencyRecordsText(
        agencyRecords,
      )}`.toLowerCase(),
  }
}

export function buildPromoterViewModels(promoters = []) {
  return promoters.map(buildPromoterViewModel)
}
