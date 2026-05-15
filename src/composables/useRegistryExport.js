import { downloadExcel } from '../utils/exporters'

export function useRegistryExport({
  kindLabels,
  filteredRowsByKind,
  selectedIds,
  analyticsReportRows,
  analyticsDetail,
  getAgencyRecords,
  formatAgencyRecordsText,
  formatTime,
  setMessage,
}) {
  function getFilteredRowsByKind(kind) {
    return filteredRowsByKind[kind]?.value || []
  }

  function getSelectedRowsByKind(kind) {
    const selectedSet = new Set(selectedIds[kind])
    return getFilteredRowsByKind(kind).filter((row) => selectedSet.has(row.id))
  }

  function mapRowsForExport(kind, rows) {
    if (kind === 'schools') {
      return rows.map((item) => ({
        省份: item.province,
        学校名称: item.name,
      }))
    }
    if (kind === 'books') {
      return rows.map((item) => ({
        ISBN: item.isbn,
        书名: item.title,
        定价: Number(item.price || 0).toFixed(2),
      }))
    }
    if (kind === 'promoters') {
      return rows.map((item) => ({
        推广商名称: item.name,
        联系人: item.contact,
        联系电话: item.phone,
        年度代理记录: formatAgencyRecordsText(getAgencyRecords(item)),
      }))
    }
    if (kind === 'reports') {
      return rows.map((item) => ({
        报备学期: item.term,
        省份: item.province,
        学校名称: item.schoolName,
        书名: item.bookLabel,
        ISBN: item.bookMode === 'single' ? item.isbn : '',
        推广商: item.promoterName,
        备注: item.note,
        报备时间: formatTime(item.updatedAt || item.createdAt),
      }))
    }
    return []
  }

  async function exportRows(kind, selectedOnly = false) {
    const rows = selectedOnly ? getSelectedRowsByKind(kind) : getFilteredRowsByKind(kind)
    if (!rows.length) {
      setMessage(`没有可导出的${selectedOnly ? '已选' : '筛选'}${kindLabels[kind]}数据。`, 'error')
      return
    }

    await downloadExcel(
      `${kindLabels[kind]}_${selectedOnly ? '已选' : '筛选结果'}_${Date.now()}.xlsx`,
      mapRowsForExport(kind, rows),
      kindLabels[kind],
    )
    setMessage(`已导出 ${rows.length} 条${kindLabels[kind]}数据。`)
  }

  async function exportAnalytics() {
    if (!analyticsReportRows.value.length) {
      setMessage('当前统计筛选下没有可导出的报备明细。', 'error')
      return
    }

    await downloadExcel(
      `统计报表_${Date.now()}.xlsx`,
      analyticsReportRows.value.map((item) => ({
        报备学期: item.term,
        省份: item.province,
        学校名称: item.schoolName,
        书名: item.bookLabel,
        ISBN: item.bookMode === 'single' ? item.isbn : '',
        推广商: item.promoterName,
        备注: item.note,
        报备时间: formatTime(item.updatedAt || item.createdAt),
      })),
      '统计报表',
    )
    setMessage(`已导出 ${analyticsReportRows.value.length} 条统计报表明细。`)
  }

  async function exportAnalyticsDetail() {
    if (!analyticsDetail.rows.length) {
      setMessage('当前没有可导出的统计明细。', 'error')
      return
    }

    await downloadExcel(
      `统计明细_${Date.now()}.xlsx`,
      mapRowsForExport('reports', analyticsDetail.rows),
      '统计明细',
    )
    setMessage(`已导出 ${analyticsDetail.rows.length} 条统计明细。`)
  }

  return {
    exportRows,
    exportAnalytics,
    exportAnalyticsDetail,
    mapRowsForExport,
  }
}
