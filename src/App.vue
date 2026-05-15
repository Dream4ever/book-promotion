<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import MultiSearchSelect from './components/MultiSearchSelect.vue'
import ModalPanel from './components/ModalPanel.vue'
import PaginationBar from './components/PaginationBar.vue'
import SearchSelect from './components/SearchSelect.vue'
import { useRegistryStore } from './composables/useRegistryStore'
import { PROVINCES } from './constants/provinces'
import { api } from './utils/api'
import { downloadExcel } from './utils/exporters'
import { mapBookRows, mapPromoterRows, mapSchoolRows } from './utils/importers'
import {
  hasReportConflict,
  normalizeReportPayload,
  normalizeTermText,
  reportMatchesBook,
  resolveReportBookMode,
  resolveReportTerm,
} from '../shared/reportRules.js'

const PAGE_SIZE = 20
const CURRENT_YEAR = new Date().getFullYear()

const store = useRegistryStore()

const tabs = [
  { key: 'schools', label: '学校名单' },
  { key: 'books', label: '书目名单' },
  { key: 'promoters', label: '推广商名单' },
  { key: 'reports', label: '报备管理' },
  { key: 'analytics', label: '统计报表' },
]

const kindLabels = {
  schools: '学校',
  books: '书目',
  promoters: '推广商',
  reports: '报备记录',
}

const termOptions = Array.from({ length: 8 }, (_, index) => {
  const year = CURRENT_YEAR - 2 + index
  return [`${year}年春`, `${year}年秋`]
}).flat()

const previewColumnsByKind = {
  schools: [
    { key: 'province', label: '省份' },
    { key: 'name', label: '学校名称' },
  ],
  books: [
    { key: 'isbn', label: 'ISBN' },
    { key: 'title', label: '书名' },
    { key: 'price', label: '定价' },
  ],
  promoters: [
    { key: 'name', label: '推广商名称' },
    { key: 'contact', label: '联系人' },
    { key: 'phone', label: '联系电话' },
    { key: 'agencyRecords', label: '年度代理记录' },
  ],
}

const activeTab = ref('schools')
const busy = ref(false)
const message = reactive({ type: 'success', text: '' })

const search = reactive({
  schools: '',
  books: '',
  promoters: '',
  reports: '',
})

const pages = reactive({
  schools: 1,
  books: 1,
  promoters: 1,
  reports: 1,
})

const modal = reactive({
  school: false,
  book: false,
  promoter: false,
  report: false,
  reportError: false,
  analyticsDetail: false,
})

const analyticsFilters = reactive({
  term: '',
  province: '',
  promoterId: '',
  bookId: '',
})

const schoolForm = reactive({ province: '', name: '' })
const bookForm = reactive({ isbn: '', title: '', price: '' })
const promoterForm = reactive({
  name: '',
  contact: '',
  phone: '',
  agencyRecordId: '',
  agencyYear: String(CURRENT_YEAR),
  agencyPeriod: '',
  workload: '',
  province: '',
  accepting: true,
  territories: [],
  agencyRecords: [],
})
const reportForm = reactive({
  schoolId: '',
  bookMode: 'single',
  bookId: '',
  bookIds: [],
  promoterId: '',
  term: '',
  note: '',
})

const reportValidationErrors = reactive({
  term: '',
  schoolId: '',
  bookId: '',
  bookIds: '',
  promoterId: '',
})

const analyticsDetail = reactive({
  title: '',
  rows: [],
})

const reportError = reactive({
  title: '',
  text: '',
})

const editing = reactive({
  schoolId: '',
  bookId: '',
  promoterId: '',
  reportId: '',
})

const selectedIds = reactive({
  schools: [],
  books: [],
  promoters: [],
  reports: [],
})

const importPreview = reactive({
  visible: false,
  kind: '',
  rows: [],
  columns: [],
  fileName: '',
  rawCount: 0,
})

const schoolOptions = computed(() =>
  store.state.schools.map((school) => ({
    id: school.id,
    label: `${school.province} / ${school.name}`,
    keywords: `${school.province} ${school.name}`,
    meta: `省份：${school.province}`,
  })),
)

const bookOptions = computed(() =>
  store.state.books.map((book) => ({
    id: book.id,
    label: `${book.title} (${book.isbn})`,
    keywords: `${book.title} ${book.isbn}`,
    meta: `定价：￥${Number(book.price || 0).toFixed(2)}`,
  })),
)

const promoterOptions = computed(() =>
  store.state.promoters.map((promoter) => ({
    id: promoter.id,
    label: promoter.name,
    keywords: `${promoter.name} ${promoter.contact} ${promoter.phone} ${formatAgencyRecordsText(
      getAgencyRecords(promoter),
    )}`,
    meta: `${promoter.contact || '未填写联系人'} / ${promoter.phone || '未填写电话'}`,
  })),
)

const joinedReports = computed(() =>
  store.state.reports.map((report) => {
    const school = store.state.schools.find((item) => item.id === report.schoolId)
    const promoter = store.state.promoters.find((item) => item.id === report.promoterId)
    const bookMode = resolveReportBookMode(report)
    const excludedBooks = resolveReportExcludedBooks(report)
    const book = bookMode === 'single' ? store.state.books.find((item) => item.id === report.bookId) : null

    return {
      ...report,
      bookMode,
      bookIds: bookMode === 'exclude' ? (report.bookIds || []) : [],
      province: school?.province || '',
      schoolName: school?.name || '学校已删除',
      schoolLabel: school ? `${school.province} / ${school.name}` : '学校已删除',
      bookTitle: book?.title || '书目已删除',
      isbn: book?.isbn || '',
      bookLabel: formatReportBookLabel(bookMode, book, excludedBooks),
      bookSearchText: formatReportBookSearchText(bookMode, book, excludedBooks),
      term: resolveReportTerm(report),
      promoterName: promoter?.name || '推广商已删除',
      promoterLabel: promoter?.name || '推广商已删除',
    }
  }),
)

const schoolFiltered = computed(() => {
  const keyword = search.schools.trim().toLowerCase()
  if (!keyword) return store.state.schools
  return store.state.schools.filter((item) =>
    `${item.province} ${item.name}`.toLowerCase().includes(keyword),
  )
})

const bookFiltered = computed(() => {
  const keyword = search.books.trim().toLowerCase()
  if (!keyword) return store.state.books
  return store.state.books.filter((item) =>
    `${item.isbn} ${item.title} ${item.price}`.toLowerCase().includes(keyword),
  )
})

const promoterFiltered = computed(() => {
  const keyword = search.promoters.trim().toLowerCase()
  if (!keyword) return store.state.promoters
  return store.state.promoters.filter((item) =>
    `${item.name} ${item.contact} ${item.phone} ${formatAgencyRecordsText(getAgencyRecords(item))}`
      .toLowerCase()
      .includes(keyword),
  )
})

const reportFiltered = computed(() => {
  const keyword = search.reports.trim().toLowerCase()
  if (!keyword) return joinedReports.value
  return joinedReports.value.filter((item) =>
    `${item.term} ${item.province} ${item.schoolName} ${item.bookSearchText} ${item.promoterName} ${item.note}`
      .toLowerCase()
      .includes(keyword),
  )
})

const schoolPageRows = computed(() => paginate(schoolFiltered.value, pages.schools))
const bookPageRows = computed(() => paginate(bookFiltered.value, pages.books))
const promoterPageRows = computed(() => paginate(promoterFiltered.value, pages.promoters))
const reportPageRows = computed(() => paginate(reportFiltered.value, pages.reports))

const conflictRecord = computed(() =>
  store.state.reports.find((item) => isReportConflict(item)),
)

const analyticsReportRows = computed(() =>
  joinedReports.value.filter((item) => {
    if (analyticsFilters.term && item.term !== analyticsFilters.term) return false
    if (analyticsFilters.province && item.province !== analyticsFilters.province) return false
    if (analyticsFilters.promoterId && item.promoterId !== analyticsFilters.promoterId) return false
    if (analyticsFilters.bookId && !reportMatchesBook(item, analyticsFilters.bookId)) return false
    return true
  }),
)

const provinceStats = computed(() =>
  summarizeRows(analyticsReportRows.value, (item) => item.province || '未识别省份', '省份'),
)

const promoterStats = computed(() =>
  summarizeRows(analyticsReportRows.value, (item) => item.promoterName || '未知推广商', '推广商'),
)

const bookStats = computed(() =>
  summarizeRows(analyticsReportRows.value, (item) => item.bookLabel || '未知书目', '书目'),
)

watch(
  () => schoolFiltered.value.length,
  (length) => syncPage('schools', length),
  { immediate: true },
)
watch(
  () => bookFiltered.value.length,
  (length) => syncPage('books', length),
  { immediate: true },
)
watch(
  () => promoterFiltered.value.length,
  (length) => syncPage('promoters', length),
  { immediate: true },
)
watch(
  () => reportFiltered.value.length,
  (length) => syncPage('reports', length),
  { immediate: true },
)
watch(
  () => search.schools,
  () => {
    pages.schools = 1
  },
)
watch(
  () => search.books,
  () => {
    pages.books = 1
  },
)
watch(
  () => search.promoters,
  () => {
    pages.promoters = 1
  },
)
watch(
  () => search.reports,
  () => {
    pages.reports = 1
  },
)
watch(
  () => reportForm.term,
  (value) => {
    if (normalizeTermText(value)) reportValidationErrors.term = ''
  },
)
watch(
  () => reportForm.schoolId,
  (value) => {
    if (value) reportValidationErrors.schoolId = ''
  },
)
watch(
  () => [reportForm.bookMode, reportForm.bookId, reportForm.bookIds.length],
  () => {
    if (reportForm.bookMode === 'all') {
      reportValidationErrors.bookId = ''
      reportValidationErrors.bookIds = ''
      return
    }
    if (reportForm.bookMode === 'single' && reportForm.bookId) {
      reportValidationErrors.bookId = ''
    }
    if (reportForm.bookMode === 'exclude' && reportForm.bookIds.length) {
      reportValidationErrors.bookIds = ''
    }
  },
)
watch(
  () => reportForm.promoterId,
  (value) => {
    if (value) reportValidationErrors.promoterId = ''
  },
)

function paginate(rows, page) {
  const start = (page - 1) * PAGE_SIZE
  return rows.slice(start, start + PAGE_SIZE)
}

function syncPage(kind, length) {
  const totalPages = Math.max(1, Math.ceil(length / PAGE_SIZE))
  if (pages[kind] > totalPages) {
    pages[kind] = totalPages
  }
}

function summarizeRows(rows, labelGetter, labelName) {
  const map = new Map()
  rows.forEach((item) => {
    const label = labelGetter(item)
    map.set(label, (map.get(label) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([name, count]) => ({ [labelName]: name, 报备数量: count }))
    .sort((a, b) => b.报备数量 - a.报备数量)
}

function setMessage(text, type = 'success') {
  message.text = text
  message.type = type
}

function clearSelections(kind) {
  selectedIds[kind] = []
}

function clearAllSelections() {
  clearSelections('schools')
  clearSelections('books')
  clearSelections('promoters')
  clearSelections('reports')
}

function isSelected(kind, id) {
  return selectedIds[kind].includes(id)
}

function toggleRowSelection(kind, id, checked) {
  selectedIds[kind] = checked
    ? Array.from(new Set([...selectedIds[kind], id]))
    : selectedIds[kind].filter((item) => item !== id)
}

function areAllSelected(kind, rows) {
  return rows.length > 0 && rows.every((row) => selectedIds[kind].includes(row.id))
}

function toggleAllSelection(kind, rows, checked) {
  selectedIds[kind] = checked ? rows.map((row) => row.id) : []
}

function resetSchoolForm() {
  schoolForm.province = ''
  schoolForm.name = ''
  editing.schoolId = ''
}

function resetBookForm() {
  bookForm.isbn = ''
  bookForm.title = ''
  bookForm.price = ''
  editing.bookId = ''
}

function resetPromoterForm() {
  promoterForm.name = ''
  promoterForm.contact = ''
  promoterForm.phone = ''
  promoterForm.agencyRecordId = ''
  promoterForm.agencyYear = String(CURRENT_YEAR)
  promoterForm.agencyPeriod = ''
  promoterForm.workload = ''
  promoterForm.province = ''
  promoterForm.accepting = true
  promoterForm.territories = []
  promoterForm.agencyRecords = []
  editing.promoterId = ''
}

function resetReportForm() {
  reportForm.schoolId = ''
  reportForm.bookMode = 'single'
  reportForm.bookId = ''
  reportForm.bookIds = []
  reportForm.promoterId = ''
  reportForm.term = ''
  reportForm.note = ''
  editing.reportId = ''
  clearReportValidationErrors()
}

function clearReportValidationErrors() {
  Object.keys(reportValidationErrors).forEach((key) => {
    reportValidationErrors[key] = ''
  })
}

function validateReportForm() {
  clearReportValidationErrors()

  if (!normalizeTermText(reportForm.term)) {
    reportValidationErrors.term = '请填写报备学期。'
  }
  if (!reportForm.schoolId) {
    reportValidationErrors.schoolId = '请选择学校。'
  }
  if (reportForm.bookMode === 'single' && !reportForm.bookId) {
    reportValidationErrors.bookId = '请选择要推广的书目。'
  }
  if (reportForm.bookMode === 'exclude' && !reportForm.bookIds.length) {
    reportValidationErrors.bookIds = '请选择需要排除的书目。'
  }
  if (!reportForm.promoterId) {
    reportValidationErrors.promoterId = '请选择推广商。'
  }

  return !Object.values(reportValidationErrors).some(Boolean)
}

function closeSchoolModal() {
  modal.school = false
  resetSchoolForm()
}

function closeBookModal() {
  modal.book = false
  resetBookForm()
}

function closePromoterModal() {
  modal.promoter = false
  resetPromoterForm()
}

function closeReportModal() {
  modal.report = false
  closeReportError()
  resetReportForm()
}

function showReportError(text, title = '报备失败') {
  message.text = ''
  reportError.title = title
  reportError.text = text || '报备提交失败，请稍后重试。'
  modal.reportError = true
}

function closeReportError() {
  modal.reportError = false
  reportError.title = ''
  reportError.text = ''
}

function openSchoolModal(school = null) {
  if (school) {
    schoolForm.province = school.province
    schoolForm.name = school.name
    editing.schoolId = school.id
  } else {
    resetSchoolForm()
  }
  modal.school = true
}

function openBookModal(book = null) {
  if (book) {
    bookForm.isbn = book.isbn
    bookForm.title = book.title
    bookForm.price = String(book.price ?? '')
    editing.bookId = book.id
  } else {
    resetBookForm()
  }
  modal.book = true
}

function openPromoterModal(promoter = null) {
  if (promoter) {
    promoterForm.name = promoter.name
    promoterForm.contact = promoter.contact
    promoterForm.phone = promoter.phone
    promoterForm.agencyRecordId = ''
    promoterForm.agencyYear = String(CURRENT_YEAR)
    promoterForm.agencyPeriod = ''
    promoterForm.workload = ''
    promoterForm.province = ''
    promoterForm.accepting = true
    promoterForm.territories = []
    promoterForm.agencyRecords = getAgencyRecords(promoter).map((item) => ({
      ...item,
      territories: (item.territories || []).map((territory) => ({ ...territory })),
    }))
    editing.promoterId = promoter.id
  } else {
    resetPromoterForm()
  }
  modal.promoter = true
}

function openReportModal(report = null) {
  closeReportError()
  clearReportValidationErrors()
  if (report) {
    reportForm.schoolId = report.schoolId
    reportForm.bookMode = resolveReportBookMode(report)
    reportForm.bookId = reportForm.bookMode === 'single' ? report.bookId : ''
    reportForm.bookIds = reportForm.bookMode === 'exclude' ? [...(report.bookIds || [])] : []
    reportForm.promoterId = report.promoterId
    reportForm.term = resolveReportTerm(report)
    reportForm.note = report.note || ''
    editing.reportId = report.id
  } else {
    resetReportForm()
  }
  modal.report = true
}

async function runAction(action, successText, afterSuccess) {
  busy.value = true
  try {
    await action()
    await store.refresh()
    clearAllSelections()
    if (afterSuccess) afterSuccess()
    if (successText) setMessage(successText)
  } catch (error) {
    setMessage(error.message, 'error')
  } finally {
    busy.value = false
  }
}

function addPromoterTerritory() {
  if (!promoterForm.province) {
    setMessage('请先选择代理省份。', 'error')
    return
  }

  const existing = promoterForm.territories.find((item) => item.province === promoterForm.province)
  if (existing) {
    existing.accepting = promoterForm.accepting
  } else {
    promoterForm.territories.push({
      province: promoterForm.province,
      accepting: promoterForm.accepting,
    })
  }

  promoterForm.province = ''
  promoterForm.accepting = true
}

function saveAgencyRecord() {
  if (!promoterForm.agencyYear) {
    setMessage('请填写代理年度。', 'error')
    return
  }

  const record = {
    id: promoterForm.agencyRecordId || `agency_${Date.now()}`,
    year: promoterForm.agencyYear,
    agencyPeriod: promoterForm.agencyPeriod,
    workload: promoterForm.workload,
    territories: promoterForm.territories.map((item) => ({ ...item })),
  }

  const duplicateYear = promoterForm.agencyRecords.find(
    (item) => item.id !== promoterForm.agencyRecordId && item.year === record.year,
  )
  if (duplicateYear) {
    setMessage('同一推广商同一年只能保留一条代理记录。', 'error')
    return
  }

  if (promoterForm.agencyRecordId) {
    promoterForm.agencyRecords = promoterForm.agencyRecords.map((item) =>
      item.id === promoterForm.agencyRecordId ? record : item,
    )
  } else {
    promoterForm.agencyRecords.push(record)
  }

  promoterForm.agencyRecords.sort((a, b) => Number(b.year) - Number(a.year))
  clearAgencyRecordDraft()
}

function editAgencyRecord(record) {
  promoterForm.agencyRecordId = record.id
  promoterForm.agencyYear = record.year
  promoterForm.agencyPeriod = record.agencyPeriod
  promoterForm.workload = record.workload
  promoterForm.province = ''
  promoterForm.accepting = true
  promoterForm.territories = record.territories.map((item) => ({ ...item }))
}

function removeAgencyRecord(recordId) {
  promoterForm.agencyRecords = promoterForm.agencyRecords.filter((item) => item.id !== recordId)
  if (promoterForm.agencyRecordId === recordId) {
    clearAgencyRecordDraft()
  }
}

function clearAgencyRecordDraft() {
  promoterForm.agencyRecordId = ''
  promoterForm.agencyYear = String(CURRENT_YEAR)
  promoterForm.agencyPeriod = ''
  promoterForm.workload = ''
  promoterForm.province = ''
  promoterForm.accepting = true
  promoterForm.territories = []
}

function removePromoterTerritory(province) {
  promoterForm.territories = promoterForm.territories.filter((item) => item.province !== province)
}

function submitSchool() {
  const isEditing = Boolean(editing.schoolId)
  runAction(
    () => (isEditing ? api.updateSchool(editing.schoolId, schoolForm) : api.createSchool(schoolForm)),
    isEditing ? '学校已修改，并同步写入 JSON 文件。' : '学校名单已写入项目目录 JSON 文件。',
    closeSchoolModal,
  )
}

function submitBook() {
  const isEditing = Boolean(editing.bookId)
  runAction(
    () => (isEditing ? api.updateBook(editing.bookId, bookForm) : api.createBook(bookForm)),
    isEditing ? '书目已修改，并同步写入 JSON 文件。' : '书目名单已写入项目目录 JSON 文件。',
    closeBookModal,
  )
}

function submitPromoter() {
  const isEditing = Boolean(editing.promoterId)
  if (!promoterForm.agencyRecords.length) {
    setMessage('请至少添加一条年度代理记录。', 'error')
    return
  }
  runAction(
    () =>
      isEditing
        ? api.updatePromoter(editing.promoterId, promoterForm)
        : api.createPromoter(promoterForm),
    isEditing ? '推广商已修改，并同步写入 JSON 文件。' : '推广商名单已写入项目目录 JSON 文件。',
    closePromoterModal,
  )
}

async function submitReport() {
  const isEditing = Boolean(editing.reportId)
  reportForm.term = normalizeTermText(reportForm.term)
  if (!validateReportForm()) {
    message.text = ''
    closeReportError()
    return
  }
  const payload = buildReportPayload()
  busy.value = true
  closeReportError()
  try {
    await (isEditing ? api.updateReport(editing.reportId, payload) : api.createReport(payload))
    await store.refresh()
    clearAllSelections()
    closeReportModal()
    setMessage(
      isEditing ? '报备记录已修改，并同步写入 JSON 文件。' : '报备成功，记录已写入项目目录 JSON 文件。',
    )
  } catch (error) {
    showReportError(error.message, isEditing ? '修改报备失败' : '新增报备失败')
  } finally {
    busy.value = false
  }
}

async function handleImport(kind, event) {
  const [file] = event.target.files || []
  if (!file) return

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const mappedRows =
      kind === 'schools'
        ? mapSchoolRows(rows)
        : kind === 'books'
          ? mapBookRows(rows)
          : mapPromoterRows(rows)

    if (!mappedRows.length) {
      throw new Error('未解析出可导入的数据，请检查 Excel 字段名称。')
    }

    importPreview.kind = kind
    importPreview.rows = mappedRows
    importPreview.columns = previewColumnsByKind[kind]
    importPreview.fileName = file.name
    importPreview.rawCount = rows.length
    importPreview.visible = true
  } catch (error) {
    setMessage(`导入预览失败：${error.message}`, 'error')
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
  runAction(
    () => api.importRows(importPreview.kind, importPreview.rows),
    `已正式导入 ${importPreview.rows.length} 条${kindLabels[importPreview.kind]}数据。`,
    closeImportPreview,
  )
}

function batchDelete(kind) {
  const ids = selectedIds[kind]
  if (!ids.length) {
    setMessage(`请先勾选要批量删除的${kindLabels[kind]}。`, 'error')
    return
  }

  runAction(
    () => api.batchDelete(kind, ids),
    `已批量删除 ${ids.length} 条${kindLabels[kind]}数据，并同步更新 JSON 文件。`,
    () => clearSelections(kind),
  )
}

function promoterTerritoryText(territories) {
  if (!territories?.length) return '未配置'
  return territories
    .map((item) => `${item.province}(${item.accepting ? '接单' : '不接单'})`)
    .join('、')
}

function getAgencyRecords(promoter) {
  if (Array.isArray(promoter?.agencyRecords) && promoter.agencyRecords.length) {
    return promoter.agencyRecords
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
      id: promoter?.id ? `${promoter.id}_legacy` : `legacy_${Date.now()}`,
      year: String(promoter?.agencyYear || CURRENT_YEAR),
      agencyPeriod: promoter?.agencyPeriod || '',
      workload: promoter?.workload || '',
      territories: legacyTerritories,
    },
  ]
}

function resolveReportExcludedBooks(report) {
  const ids = Array.isArray(report?.bookIds) ? report.bookIds : []
  return ids
    .map((id) => store.state.books.find((book) => book.id === id))
    .filter(Boolean)
}

function formatBookOption(book) {
  return book ? `${book.title} (${book.isbn})` : '书目已删除'
}

function formatReportBookLabel(bookMode, book, excludedBooks) {
  if (bookMode === 'all') return '所有图书'
  if (bookMode === 'exclude') {
    if (!excludedBooks.length) return '排除指定图书'
    return `排除 ${excludedBooks.length} 本：${excludedBooks.map(formatBookOption).join('、')}`
  }
  return formatBookOption(book)
}

function formatReportBookSearchText(bookMode, book, excludedBooks) {
  if (bookMode === 'all') return '所有图书 推广所有图书'
  if (bookMode === 'exclude') {
    return `排除指定图书 只有所选图书不推广 ${excludedBooks.map(formatBookOption).join(' ')}`
  }
  return book ? `${book.title} ${book.isbn}` : '书目已删除'
}

function isReportConflict(report) {
  return hasReportConflict(report, buildReportPayload(), editing.reportId)
}

function buildReportPayload() {
  return normalizeReportPayload({
    schoolId: reportForm.schoolId,
    bookMode: reportForm.bookMode,
    bookId: reportForm.bookId,
    bookIds: reportForm.bookIds,
    promoterId: reportForm.promoterId,
    term: reportForm.term,
    note: reportForm.note,
  })
}

function formatAgencyRecordsText(records) {
  if (!records?.length) return '未配置'
  return records
    .map(
      (item) =>
        `${item.year}年: ${promoterTerritoryText(item.territories)} / ${item.agencyPeriod || '-'} / ${item.workload || '-'}`,
    )
    .join('；')
}

function latestAgencyRecord(records) {
  if (!records?.length) return null
  return [...records].sort((a, b) => Number(b.year) - Number(a.year))[0]
}

function formatTime(value) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPreviewValue(kind, row, key) {
  if (kind === 'books' && key === 'price') {
    return `￥${Number(row.price || 0).toFixed(2)}`
  }
  if (kind === 'promoters' && key === 'agencyRecords') {
    return formatAgencyRecordsText(row.agencyRecords)
  }
  return row[key] || '-'
}

function openAnalyticsDetail(title, rows) {
  analyticsDetail.title = title
  analyticsDetail.rows = rows
  modal.analyticsDetail = true
}

function closeAnalyticsDetail() {
  analyticsDetail.title = ''
  analyticsDetail.rows = []
  modal.analyticsDetail = false
}

function analyticsRowsBy(field, value) {
  return analyticsReportRows.value.filter((item) => item[field] === value)
}

function getFilteredRowsByKind(kind) {
  if (kind === 'schools') return schoolFiltered.value
  if (kind === 'books') return bookFiltered.value
  if (kind === 'promoters') return promoterFiltered.value
  if (kind === 'reports') return reportFiltered.value
  return []
}

function getSelectedRowsByKind(kind) {
  const idSet = new Set(selectedIds[kind])
  return getFilteredRowsByKind(kind).filter((item) => idSet.has(item.id))
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

function exportRows(kind, selectedOnly = false) {
  const rows = selectedOnly ? getSelectedRowsByKind(kind) : getFilteredRowsByKind(kind)
  if (!rows.length) {
    setMessage(`没有可导出的${selectedOnly ? '已选' : '筛选'}${kindLabels[kind]}数据。`, 'error')
    return
  }

  downloadExcel(
    `${kindLabels[kind]}_${selectedOnly ? '已选' : '筛选结果'}_${Date.now()}.xlsx`,
    mapRowsForExport(kind, rows),
    kindLabels[kind],
  )
  setMessage(`已导出 ${rows.length} 条${kindLabels[kind]}数据。`)
}

function exportAnalytics() {
  if (!analyticsReportRows.value.length) {
    setMessage('当前统计筛选下没有可导出的报备明细。', 'error')
    return
  }
  downloadExcel(
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

function exportAnalyticsDetail() {
  if (!analyticsDetail.rows.length) {
    setMessage('当前没有可导出的统计明细。', 'error')
    return
  }

  downloadExcel(
    `统计明细_${Date.now()}.xlsx`,
    mapRowsForExport('reports', analyticsDetail.rows),
    '统计明细',
  )
  setMessage(`已导出 ${analyticsDetail.rows.length} 条统计明细。`)
}

onMounted(async () => {
  try {
    await store.refresh()
  } catch (error) {
    setMessage(`初始化失败：${error.message}`, 'error')
  }
})
</script>

<template>
  <div class="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <section class="panel p-6 lg:p-8">
      <p class="tag">本地 JSON 持久化 / 搜索 / 分页 / 批量导出</p>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight text-sand-900 sm:text-4xl">
        出版社推广商报备系统
      </h1>
      <p class="mt-4 max-w-4xl text-sm leading-7 text-sand-700 sm:text-base">
        所有数据统一保存在项目目录下的 <span class="font-medium">data/db.json</span>。
        同一个学校的同一个书目在同一个学期只能由一个推广商报备。
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="rounded-full px-4 py-2 text-sm transition"
          :class="activeTab === tab.key ? 'bg-pine-600 text-white' : 'bg-white text-sand-700 hover:bg-sand-100'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section
      v-if="message.text"
      class="mt-6 rounded-2xl border px-4 py-3 text-sm"
      :class="message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-pine-200 bg-pine-50 text-pine-700'"
    >
      {{ message.text }}
    </section>

    <section v-if="activeTab === 'schools'" class="mt-6 panel p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-sand-900">学校名单</h2>
          <p class="mt-1 text-sm text-sand-600">支持搜索、分页、批量删除、批量导出。</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <input v-model="search.schools" class="field-input w-64" type="text" placeholder="搜索省份 / 学校名称" />
          <button type="button" class="primary-button" :disabled="busy" @click="openSchoolModal()">新增学校</button>
          <label class="secondary-button cursor-pointer">
            Excel 导入
            <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="handleImport('schools', $event)" />
          </label>
          <button type="button" class="secondary-button" @click="exportRows('schools')">导出筛选结果</button>
          <button type="button" class="secondary-button" :disabled="!selectedIds.schools.length" @click="exportRows('schools', true)">导出已选</button>
          <button type="button" class="danger-button" :disabled="busy || !selectedIds.schools.length" @click="batchDelete('schools')">批量删除</button>
        </div>
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-sand-200 text-sand-500">
            <tr>
              <th class="px-3 py-3 font-medium">
                <input type="checkbox" :checked="areAllSelected('schools', schoolPageRows)" @change="toggleAllSelection('schools', schoolPageRows, $event.target.checked)" />
              </th>
              <th class="px-3 py-3 font-medium">省份</th>
              <th class="px-3 py-3 font-medium">学校名称</th>
              <th class="px-3 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="school in schoolPageRows" :key="school.id" class="border-b border-sand-100">
              <td class="px-3 py-3">
                <input type="checkbox" :checked="isSelected('schools', school.id)" @change="toggleRowSelection('schools', school.id, $event.target.checked)" />
              </td>
              <td class="px-3 py-3">{{ school.province }}</td>
              <td class="px-3 py-3 text-sand-900">{{ school.name }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="openSchoolModal(school)">编辑</button>
                  <button type="button" class="danger-button" :disabled="busy" @click="runAction(() => api.deleteSchool(school.id), '学校已删除，并同步更新 JSON 文件。')">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!schoolPageRows.length">
              <td colspan="4" class="px-3 py-8 text-center text-sand-500">暂无学校数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :page="pages.schools" :total-items="schoolFiltered.length" :page-size="PAGE_SIZE" @update:page="pages.schools = $event" />
    </section>

    <section v-if="activeTab === 'books'" class="mt-6 panel p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-sand-900">书目名单</h2>
          <p class="mt-1 text-sm text-sand-600">默认每页 20 条，支持搜索和导出。</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <input v-model="search.books" class="field-input w-64" type="text" placeholder="搜索 ISBN / 书名 / 定价" />
          <button type="button" class="primary-button" :disabled="busy" @click="openBookModal()">新增书目</button>
          <label class="secondary-button cursor-pointer">
            Excel 导入
            <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="handleImport('books', $event)" />
          </label>
          <button type="button" class="secondary-button" @click="exportRows('books')">导出筛选结果</button>
          <button type="button" class="secondary-button" :disabled="!selectedIds.books.length" @click="exportRows('books', true)">导出已选</button>
          <button type="button" class="danger-button" :disabled="busy || !selectedIds.books.length" @click="batchDelete('books')">批量删除</button>
        </div>
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-sand-200 text-sand-500">
            <tr>
              <th class="px-3 py-3 font-medium">
                <input type="checkbox" :checked="areAllSelected('books', bookPageRows)" @change="toggleAllSelection('books', bookPageRows, $event.target.checked)" />
              </th>
              <th class="px-3 py-3 font-medium">ISBN</th>
              <th class="px-3 py-3 font-medium">书名</th>
              <th class="px-3 py-3 font-medium">定价</th>
              <th class="px-3 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="book in bookPageRows" :key="book.id" class="border-b border-sand-100">
              <td class="px-3 py-3">
                <input type="checkbox" :checked="isSelected('books', book.id)" @change="toggleRowSelection('books', book.id, $event.target.checked)" />
              </td>
              <td class="px-3 py-3">{{ book.isbn }}</td>
              <td class="px-3 py-3 text-sand-900">{{ book.title }}</td>
              <td class="px-3 py-3">￥{{ Number(book.price || 0).toFixed(2) }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="openBookModal(book)">编辑</button>
                  <button type="button" class="danger-button" :disabled="busy" @click="runAction(() => api.deleteBook(book.id), '书目已删除，并同步更新 JSON 文件。')">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!bookPageRows.length">
              <td colspan="5" class="px-3 py-8 text-center text-sand-500">暂无书目数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :page="pages.books" :total-items="bookFiltered.length" :page-size="PAGE_SIZE" @update:page="pages.books = $event" />
    </section>

    <section v-if="activeTab === 'promoters'" class="mt-6 panel p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-sand-900">推广商名单</h2>
          <p class="mt-1 text-sm text-sand-600">可按名称、联系人、电话、代理省份搜索。</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <input v-model="search.promoters" class="field-input w-72" type="text" placeholder="搜索推广商 / 联系人 / 电话 / 省份" />
          <button type="button" class="primary-button" :disabled="busy" @click="openPromoterModal()">新增推广商</button>
          <label class="secondary-button cursor-pointer">
            Excel 导入
            <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="handleImport('promoters', $event)" />
          </label>
          <button type="button" class="secondary-button" @click="exportRows('promoters')">导出筛选结果</button>
          <button type="button" class="secondary-button" :disabled="!selectedIds.promoters.length" @click="exportRows('promoters', true)">导出已选</button>
          <button type="button" class="danger-button" :disabled="busy || !selectedIds.promoters.length" @click="batchDelete('promoters')">批量删除</button>
        </div>
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-sand-200 text-sand-500">
            <tr>
              <th class="px-3 py-3 font-medium">
                <input type="checkbox" :checked="areAllSelected('promoters', promoterPageRows)" @change="toggleAllSelection('promoters', promoterPageRows, $event.target.checked)" />
              </th>
              <th class="px-3 py-3 font-medium">推广商</th>
              <th class="px-3 py-3 font-medium">联系人</th>
              <th class="px-3 py-3 font-medium">联系电话</th>
              <th class="px-3 py-3 font-medium">最近代理年度</th>
              <th class="px-3 py-3 font-medium">最新代理配置</th>
              <th class="px-3 py-3 font-medium">历史记录数</th>
              <th class="px-3 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="promoter in promoterPageRows" :key="promoter.id" class="border-b border-sand-100 align-top">
              <td class="px-3 py-3">
                <input type="checkbox" :checked="isSelected('promoters', promoter.id)" @change="toggleRowSelection('promoters', promoter.id, $event.target.checked)" />
              </td>
              <td class="px-3 py-3 font-medium text-sand-900">{{ promoter.name }}</td>
              <td class="px-3 py-3">{{ promoter.contact || '-' }}</td>
              <td class="px-3 py-3">{{ promoter.phone || '-' }}</td>
              <td class="px-3 py-3">{{ latestAgencyRecord(getAgencyRecords(promoter))?.year || '-' }}</td>
              <td class="px-3 py-3 text-xs leading-6 text-sand-700">
                {{ latestAgencyRecord(getAgencyRecords(promoter)) ? `${promoterTerritoryText(latestAgencyRecord(getAgencyRecords(promoter)).territories)} / ${latestAgencyRecord(getAgencyRecords(promoter)).agencyPeriod || '-'} / ${latestAgencyRecord(getAgencyRecords(promoter)).workload || '-'}` : '-' }}
              </td>
              <td class="px-3 py-3">{{ getAgencyRecords(promoter).length }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="openPromoterModal(promoter)">编辑</button>
                  <button type="button" class="danger-button" :disabled="busy" @click="runAction(() => api.deletePromoter(promoter.id), '推广商已删除，并同步更新 JSON 文件。')">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!promoterPageRows.length">
              <td colspan="8" class="px-3 py-8 text-center text-sand-500">暂无推广商数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :page="pages.promoters" :total-items="promoterFiltered.length" :page-size="PAGE_SIZE" @update:page="pages.promoters = $event" />
    </section>

    <section v-if="activeTab === 'reports'" class="mt-6 panel p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-sand-900">报备记录</h2>
          <p class="mt-1 text-sm text-sand-600">报备时支持模糊查询，修改时仍校验唯一性。</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <input v-model="search.reports" class="field-input w-72" type="text" placeholder="搜索学期 / 省份 / 学校 / 书目 / 推广商" />
          <button type="button" class="primary-button" :disabled="busy" @click="openReportModal()">新增报备</button>
          <button type="button" class="secondary-button" @click="exportRows('reports')">导出筛选结果</button>
          <button type="button" class="secondary-button" :disabled="!selectedIds.reports.length" @click="exportRows('reports', true)">导出已选</button>
          <button type="button" class="danger-button" :disabled="busy || !selectedIds.reports.length" @click="batchDelete('reports')">批量删除</button>
        </div>
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-sand-200 text-sand-500">
            <tr>
              <th class="px-3 py-3 font-medium">
                <input type="checkbox" :checked="areAllSelected('reports', reportPageRows)" @change="toggleAllSelection('reports', reportPageRows, $event.target.checked)" />
              </th>
              <th class="px-3 py-3 font-medium">报备学期</th>
              <th class="px-3 py-3 font-medium">省份 / 学校</th>
              <th class="px-3 py-3 font-medium">书目</th>
              <th class="px-3 py-3 font-medium">推广商</th>
              <th class="px-3 py-3 font-medium">备注</th>
              <th class="px-3 py-3 font-medium">报备时间</th>
              <th class="px-3 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in reportPageRows" :key="report.id" class="border-b border-sand-100 align-top">
              <td class="px-3 py-3">
                <input type="checkbox" :checked="isSelected('reports', report.id)" @change="toggleRowSelection('reports', report.id, $event.target.checked)" />
              </td>
              <td class="px-3 py-3">{{ report.term }}</td>
              <td class="px-3 py-3">{{ report.schoolLabel }}</td>
              <td class="px-3 py-3">{{ report.bookLabel }}</td>
              <td class="px-3 py-3">{{ report.promoterLabel }}</td>
              <td class="px-3 py-3 text-sand-700">{{ report.note || '-' }}</td>
              <td class="px-3 py-3">{{ formatTime(report.updatedAt || report.createdAt) }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="openReportModal(report)">编辑</button>
                  <button type="button" class="danger-button" :disabled="busy" @click="runAction(() => api.deleteReport(report.id), '报备记录已删除，并同步更新 JSON 文件。')">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!reportPageRows.length">
              <td colspan="8" class="px-3 py-8 text-center text-sand-500">暂无报备记录</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :page="pages.reports" :total-items="reportFiltered.length" :page-size="PAGE_SIZE" @update:page="pages.reports = $event" />
    </section>

    <section v-if="activeTab === 'analytics'" class="mt-6 grid gap-6">
      <div class="panel p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-sand-900">统计报表</h2>
            <p class="mt-1 text-sm text-sand-600">按省份、推广商、书目筛选当前报备记录并统计。</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <select v-model="analyticsFilters.term" class="field-input w-40">
              <option value="">全部学期</option>
              <option v-for="term in termOptions" :key="term" :value="term">{{ term }}</option>
            </select>
            <select v-model="analyticsFilters.province" class="field-input w-40">
              <option value="">全部省份</option>
              <option v-for="province in PROVINCES" :key="province" :value="province">{{ province }}</option>
            </select>
            <select v-model="analyticsFilters.promoterId" class="field-input w-52">
              <option value="">全部推广商</option>
              <option v-for="promoter in store.state.promoters" :key="promoter.id" :value="promoter.id">{{ promoter.name }}</option>
            </select>
            <select v-model="analyticsFilters.bookId" class="field-input w-64">
              <option value="">全部书目</option>
              <option v-for="book in store.state.books" :key="book.id" :value="book.id">{{ book.title }} ({{ book.isbn }})</option>
            </select>
            <button type="button" class="secondary-button" @click="exportAnalytics">导出筛选明细</button>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap gap-3 text-sm">
          <span class="tag">筛选后报备数：{{ analyticsReportRows.length }}</span>
          <span class="tag">省份维度：{{ provinceStats.length }}</span>
          <span class="tag">推广商维度：{{ promoterStats.length }}</span>
          <span class="tag">书目维度：{{ bookStats.length }}</span>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="panel p-6">
          <h3 class="text-lg font-semibold text-sand-900">按省份统计</h3>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-sand-200 text-sand-500">
                <tr>
                  <th class="px-3 py-3 font-medium">省份</th>
                  <th class="px-3 py-3 font-medium">报备数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in provinceStats" :key="row.省份" class="border-b border-sand-100">
                  <td class="px-3 py-3">{{ row.省份 }}</td>
                  <td class="px-3 py-3">
                    <button type="button" class="text-pine-600 underline-offset-4 hover:underline" @click="openAnalyticsDetail(`${row.省份} 报备明细`, analyticsRowsBy('province', row.省份))">
                      {{ row.报备数量 }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!provinceStats.length">
                  <td colspan="2" class="px-3 py-8 text-center text-sand-500">暂无统计数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel p-6">
          <h3 class="text-lg font-semibold text-sand-900">按推广商统计</h3>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-sand-200 text-sand-500">
                <tr>
                  <th class="px-3 py-3 font-medium">推广商</th>
                  <th class="px-3 py-3 font-medium">报备数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in promoterStats" :key="row.推广商" class="border-b border-sand-100">
                  <td class="px-3 py-3">{{ row.推广商 }}</td>
                  <td class="px-3 py-3">
                    <button type="button" class="text-pine-600 underline-offset-4 hover:underline" @click="openAnalyticsDetail(`${row.推广商} 报备明细`, analyticsRowsBy('promoterName', row.推广商))">
                      {{ row.报备数量 }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!promoterStats.length">
                  <td colspan="2" class="px-3 py-8 text-center text-sand-500">暂无统计数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel p-6">
          <h3 class="text-lg font-semibold text-sand-900">按书目统计</h3>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-sand-200 text-sand-500">
                <tr>
                  <th class="px-3 py-3 font-medium">书目</th>
                  <th class="px-3 py-3 font-medium">报备数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in bookStats" :key="row.书目" class="border-b border-sand-100">
                  <td class="px-3 py-3">{{ row.书目 }}</td>
                  <td class="px-3 py-3">
                    <button type="button" class="text-pine-600 underline-offset-4 hover:underline" @click="openAnalyticsDetail(`${row.书目} 报备明细`, analyticsRowsBy('bookLabel', row.书目))">
                      {{ row.报备数量 }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!bookStats.length">
                  <td colspan="2" class="px-3 py-8 text-center text-sand-500">暂无统计数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <ModalPanel :visible="modal.school" :title="editing.schoolId ? '修改学校' : '新增学校'" @close="closeSchoolModal">
      <div class="grid gap-4">
        <div>
          <label class="label-text">省份</label>
          <select v-model="schoolForm.province" class="field-input">
            <option value="">请选择省份</option>
            <option v-for="province in PROVINCES" :key="province" :value="province">{{ province }}</option>
          </select>
        </div>
        <div>
          <label class="label-text">学校名称</label>
          <input v-model="schoolForm.name" class="field-input" type="text" placeholder="例如：杭州第一中学" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="busy" @click="closeSchoolModal">取消</button>
        <button type="button" class="primary-button" :disabled="busy" @click="submitSchool">{{ editing.schoolId ? '保存修改' : '确认新增' }}</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="modal.book" :title="editing.bookId ? '修改书目' : '新增书目'" @close="closeBookModal">
      <div class="grid gap-4">
        <div>
          <label class="label-text">ISBN</label>
          <input v-model="bookForm.isbn" class="field-input" type="text" placeholder="例如：9787300000000" />
        </div>
        <div>
          <label class="label-text">书名</label>
          <input v-model="bookForm.title" class="field-input" type="text" placeholder="例如：语文同步阅读" />
        </div>
        <div>
          <label class="label-text">定价</label>
          <input v-model="bookForm.price" class="field-input" type="number" min="0" step="0.01" placeholder="例如：39.80" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="busy" @click="closeBookModal">取消</button>
        <button type="button" class="primary-button" :disabled="busy" @click="submitBook">{{ editing.bookId ? '保存修改' : '确认新增' }}</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="modal.promoter" :title="editing.promoterId ? '修改推广商' : '新增推广商'" max-width-class="max-w-5xl" @close="closePromoterModal">
      <template #description>
        <p class="mt-2 text-sm text-sand-600">代理配置按年度保存，同一推广商同一年仅保留一条记录。</p>
      </template>
      <div class="grid gap-4">
        <div>
          <label class="label-text">推广商名称</label>
          <input v-model="promoterForm.name" class="field-input" type="text" placeholder="例如：华东教育推广中心" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label-text">联系人</label>
            <input v-model="promoterForm.contact" class="field-input" type="text" placeholder="联系人姓名" />
          </div>
          <div>
            <label class="label-text">联系电话</label>
            <input v-model="promoterForm.phone" class="field-input" type="text" placeholder="手机号或座机" />
          </div>
        </div>
        <div class="grid gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h4 class="text-base font-semibold text-sand-900">年度代理记录</h4>
              <p class="mt-1 text-sm text-sand-600">先编辑某一年度的代理信息，再加入下方历史记录列表。</p>
            </div>
            <span class="tag">{{ promoterForm.agencyRecords.length }} 条历史记录</span>
          </div>
          <div class="grid gap-4 lg:grid-cols-3">
            <div>
              <label class="label-text">代理年度</label>
              <input v-model="promoterForm.agencyYear" class="field-input" type="number" min="2000" max="2100" placeholder="例如：2026" />
            </div>
            <div>
              <label class="label-text">代理期间</label>
              <input v-model="promoterForm.agencyPeriod" class="field-input" type="text" placeholder="例如：2026.01-2026.12" />
            </div>
            <div>
              <label class="label-text">任务量</label>
              <input v-model="promoterForm.workload" class="field-input" type="text" placeholder="例如：年度目标 50 校" />
            </div>
          </div>
          <div class="rounded-2xl border border-sand-200 bg-white p-4">
            <div class="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div>
                <label class="label-text">代理省份</label>
                <select v-model="promoterForm.province" class="field-input">
                  <option value="">请选择省份</option>
                  <option v-for="province in PROVINCES" :key="province" :value="province">{{ province }}</option>
                </select>
              </div>
              <div>
                <label class="label-text">是否接单</label>
                <select v-model="promoterForm.accepting" class="field-input">
                  <option :value="true">接单</option>
                  <option :value="false">不接单</option>
                </select>
              </div>
              <button type="button" class="secondary-button" @click="addPromoterTerritory">添加省份</button>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <div
                v-for="territory in promoterForm.territories"
                :key="territory.province"
                class="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-2 text-sm text-sand-800"
              >
                <span>{{ territory.province }} / {{ territory.accepting ? '接单' : '不接单' }}</span>
                <button type="button" class="text-sand-400 transition hover:text-red-600" @click="removePromoterTerritory(territory.province)">删除</button>
              </div>
              <div v-if="!promoterForm.territories.length" class="text-sm text-sand-500">当前年度还没有配置代理省份</div>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="secondary-button" @click="saveAgencyRecord">
              {{ promoterForm.agencyRecordId ? '保存年度记录' : '加入年度记录' }}
            </button>
            <button type="button" class="secondary-button" @click="clearAgencyRecordDraft">清空当前年度</button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-sand-200 text-sand-500">
                <tr>
                  <th class="px-3 py-3 font-medium">年度</th>
                  <th class="px-3 py-3 font-medium">代理省份配置</th>
                  <th class="px-3 py-3 font-medium">代理期间</th>
                  <th class="px-3 py-3 font-medium">任务量</th>
                  <th class="px-3 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in promoterForm.agencyRecords" :key="record.id" class="border-b border-sand-100 align-top">
                  <td class="px-3 py-3 font-medium text-sand-900">{{ record.year }}年</td>
                  <td class="px-3 py-3 text-xs leading-6 text-sand-700">{{ promoterTerritoryText(record.territories) }}</td>
                  <td class="px-3 py-3">{{ record.agencyPeriod || '-' }}</td>
                  <td class="px-3 py-3">{{ record.workload || '-' }}</td>
                  <td class="px-3 py-3">
                    <div class="flex flex-wrap gap-2">
                      <button type="button" class="secondary-button !px-3 !py-2 !text-xs" @click="editAgencyRecord(record)">编辑</button>
                      <button type="button" class="danger-button" @click="removeAgencyRecord(record.id)">删除</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!promoterForm.agencyRecords.length">
                  <td colspan="5" class="px-3 py-8 text-center text-sand-500">还没有保存年度代理记录</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="busy" @click="closePromoterModal">取消</button>
        <button type="button" class="primary-button" :disabled="busy" @click="submitPromoter">{{ editing.promoterId ? '保存修改' : '确认新增' }}</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="modal.report" :title="editing.reportId ? '修改报备' : '新增报备'" max-width-class="max-w-4xl" @close="closeReportModal">
      <div class="grid gap-4">
        <div>
          <label class="label-text">报备学期</label>
          <input
            v-model="reportForm.term"
            class="field-input"
            :class="{ 'field-input-error': reportValidationErrors.term }"
            type="text"
            list="report-term-options"
            placeholder="例如：2026年春 或 2026年秋"
            :aria-invalid="reportValidationErrors.term ? 'true' : 'false'"
          />
          <datalist id="report-term-options">
            <option v-for="term in termOptions" :key="term" :value="term" />
          </datalist>
          <p v-if="reportValidationErrors.term" class="field-error-text">{{ reportValidationErrors.term }}</p>
        </div>
        <div>
          <label class="label-text">学校</label>
          <SearchSelect
            v-model="reportForm.schoolId"
            :options="schoolOptions"
            placeholder="输入省份或学校名称"
            empty-text="未匹配到学校"
            :invalid="Boolean(reportValidationErrors.schoolId)"
          />
          <p v-if="reportValidationErrors.schoolId" class="field-error-text">{{ reportValidationErrors.schoolId }}</p>
        </div>
        <div>
          <label class="label-text">书目</label>
          <div
            class="grid gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-4"
            :class="{ 'border-red-300 bg-red-50/40': reportValidationErrors.bookId || reportValidationErrors.bookIds }"
          >
            <label class="flex items-start gap-3 rounded-xl bg-white px-3 py-3 text-sm text-sand-800">
              <input v-model="reportForm.bookMode" class="mt-1" type="radio" value="single" />
              <span>
                <span class="block font-medium text-sand-900">选择任意一本书</span>
                <span class="mt-1 block text-xs text-sand-500">只记录所选图书 ID，冲突规则沿用单本书报备。</span>
              </span>
            </label>
            <SearchSelect
              v-if="reportForm.bookMode === 'single'"
              v-model="reportForm.bookId"
              :options="bookOptions"
              placeholder="输入 ISBN 或书名"
              empty-text="未匹配到书目"
              :invalid="Boolean(reportValidationErrors.bookId)"
            />
            <p v-if="reportValidationErrors.bookId" class="field-error-text">{{ reportValidationErrors.bookId }}</p>

            <label class="flex items-start gap-3 rounded-xl bg-white px-3 py-3 text-sm text-sand-800">
              <input v-model="reportForm.bookMode" class="mt-1" type="radio" value="all" />
              <span>
                <span class="block font-medium text-sand-900">选择所有书</span>
                <span class="mt-1 block text-xs text-sand-500">不记录具体书目，备注默认为“推广所有图书”。</span>
              </span>
            </label>

            <label class="flex items-start gap-3 rounded-xl bg-white px-3 py-3 text-sm text-sand-800">
              <input v-model="reportForm.bookMode" class="mt-1" type="radio" value="exclude" />
              <span>
                <span class="block font-medium text-sand-900">只排除选择的某些书</span>
                <span class="mt-1 block text-xs text-sand-500">记录被排除的图书 ID，备注默认为“只有所选图书不推广”。</span>
              </span>
            </label>
            <MultiSearchSelect
              v-if="reportForm.bookMode === 'exclude'"
              v-model="reportForm.bookIds"
              :options="bookOptions"
              placeholder="搜索要排除的 ISBN 或书名"
              empty-text="未匹配到书目"
              :invalid="Boolean(reportValidationErrors.bookIds)"
            />
            <p v-if="reportValidationErrors.bookIds" class="field-error-text">{{ reportValidationErrors.bookIds }}</p>
          </div>
        </div>
        <div>
          <label class="label-text">推广商</label>
          <SearchSelect
            v-model="reportForm.promoterId"
            :options="promoterOptions"
            placeholder="输入推广商、联系人或电话"
            empty-text="未匹配到推广商"
            :invalid="Boolean(reportValidationErrors.promoterId)"
          />
          <p v-if="reportValidationErrors.promoterId" class="field-error-text">{{ reportValidationErrors.promoterId }}</p>
        </div>
        <div>
          <label class="label-text">备注</label>
          <textarea v-model="reportForm.note" class="field-input min-h-24" placeholder="可选"></textarea>
        </div>
        <div v-if="conflictRecord" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {{ conflictRecord.term }} 的当前组合已被
          <span class="font-semibold">{{ promoterOptions.find((item) => item.id === conflictRecord.promoterId)?.label || '其他推广商' }}</span>
          报备，系统会阻止重复提交。
        </div>
      </div>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="busy" @click="closeReportModal">取消</button>
        <button type="button" class="primary-button" :disabled="busy" @click="submitReport">{{ editing.reportId ? '保存修改' : '确认新增' }}</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="modal.reportError" :title="reportError.title" max-width-class="max-w-md" @close="closeReportError">
      <p class="text-sm leading-6 text-red-700">{{ reportError.text }}</p>
      <template #footer>
        <button type="button" class="primary-button" @click="closeReportError">知道了</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="modal.analyticsDetail" :title="analyticsDetail.title || '统计明细'" max-width-class="max-w-6xl" @close="closeAnalyticsDetail">
      <template #description>
        <p class="mt-2 text-sm text-sand-600">共 {{ analyticsDetail.rows.length }} 条报备记录，保留历史学期数据可直接查询。</p>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-sand-200 text-sand-500">
            <tr>
              <th class="px-3 py-3 font-medium">报备学期</th>
              <th class="px-3 py-3 font-medium">省份 / 学校</th>
              <th class="px-3 py-3 font-medium">书目</th>
              <th class="px-3 py-3 font-medium">推广商</th>
              <th class="px-3 py-3 font-medium">备注</th>
              <th class="px-3 py-3 font-medium">报备时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in analyticsDetail.rows" :key="row.id" class="border-b border-sand-100 align-top">
              <td class="px-3 py-3">{{ row.term }}</td>
              <td class="px-3 py-3">{{ row.schoolLabel }}</td>
              <td class="px-3 py-3">{{ row.bookLabel }}</td>
              <td class="px-3 py-3">{{ row.promoterLabel }}</td>
              <td class="px-3 py-3 text-sand-700">{{ row.note || '-' }}</td>
              <td class="px-3 py-3">{{ formatTime(row.updatedAt || row.createdAt) }}</td>
            </tr>
            <tr v-if="!analyticsDetail.rows.length">
              <td colspan="6" class="px-3 py-8 text-center text-sand-500">暂无明细数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button type="button" class="secondary-button" @click="closeAnalyticsDetail">关闭</button>
        <button type="button" class="primary-button" @click="exportAnalyticsDetail">导出明细</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="importPreview.visible" title="导入预览确认" max-width-class="max-w-6xl" @close="closeImportPreview">
      <template #description>
        <p class="mt-2 text-sm text-sand-600">
          文件：{{ importPreview.fileName }}，原始行数 {{ importPreview.rawCount }}，可导入 {{ importPreview.rows.length }} 条{{ kindLabels[importPreview.kind] }}数据。
        </p>
      </template>
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-sand-200 text-sand-500">
          <tr>
            <th class="px-3 py-3 font-medium">#</th>
            <th v-for="column in importPreview.columns" :key="column.key" class="px-3 py-3 font-medium">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in importPreview.rows" :key="index" class="border-b border-sand-100 align-top">
            <td class="px-3 py-3">{{ index + 1 }}</td>
            <td v-for="column in importPreview.columns" :key="column.key" class="px-3 py-3">
              {{ formatPreviewValue(importPreview.kind, row, column.key) }}
            </td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="busy" @click="closeImportPreview">取消</button>
        <button type="button" class="primary-button" :disabled="busy" @click="confirmImport">确认导入</button>
      </template>
    </ModalPanel>
  </div>
</template>
