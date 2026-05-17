import { reactive } from 'vue'
import { api, getErrorMessage } from '../utils/api'
import { mapBookRows, mapPromoterRows, mapSchoolRows } from '../utils/importers'

const importMappers = {
  schools: mapSchoolRows,
  books: mapBookRows,
  promoters: mapPromoterRows,
}

export function useRegistryImport({
  kindLabels,
  previewColumnsByKind,
  runAction,
  clearSelections,
  setMessage,
}) {
  const importPreview = reactive({
    visible: false,
    kind: '',
    rows: [],
    columns: [],
    fileName: '',
    rawCount: 0,
  })

  async function handleImport(kind, event) {
    const [file] = event.target.files || []
    if (!file) return

    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const mapper = importMappers[kind]
      const mappedRows = mapper ? mapper(rows) : []

      if (!mappedRows.length) {
        throw new Error('未解析出可导入的数据，请检查 Excel 字段名称。')
      }

      importPreview.visible = true
      importPreview.kind = kind
      importPreview.rows = mappedRows
      importPreview.columns = previewColumnsByKind[kind] || []
      importPreview.fileName = file.name
      importPreview.rawCount = rows.length
    } catch (error) {
      setMessage(`导入预览失败：${getErrorMessage(error)}`, 'error')
    } finally {
      event.target.value = ''
    }
  }

  function closeImportPreview() {
    importPreview.visible = false
    importPreview.kind = ''
    importPreview.rows = []
    importPreview.columns = []
    importPreview.fileName = ''
    importPreview.rawCount = 0
  }

  function confirmImport() {
    const kind = importPreview.kind
    runAction(
      () => api.importRows(kind, importPreview.rows),
      `已正式导入 ${importPreview.rows.length} 条${kindLabels[kind]}数据。`,
      () => {
        clearSelections(kind)
        closeImportPreview()
      },
    )
  }

  return {
    importPreview,
    handleImport,
    closeImportPreview,
    confirmImport,
  }
}
