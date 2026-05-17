<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AnalyticsTab from './components/AnalyticsTab.vue'
import BooksTab from './components/BooksTab.vue'
import ModalPanel from './components/ModalPanel.vue'
import PromotersTab from './components/PromotersTab.vue'
import ReportBookSelector from './components/ReportBookSelector.vue'
import ReportsTab from './components/ReportsTab.vue'
import SearchSelect from './components/SearchSelect.vue'
import SchoolsTab from './components/SchoolsTab.vue'
import { useRegistryImport } from './composables/useRegistryImport'
import { usePagedLists } from './composables/usePagedLists'
import { useRegistryStore } from './composables/useRegistryStore'
import { useRegistryExport } from './composables/useRegistryExport'
import { useRowSelection } from './composables/useRowSelection'
import { PROVINCES } from './constants/provinces'
import { api } from './utils/api'
import {
  findReportConflicts,
  normalizeReportPayload,
  normalizeTermText,
  reportMatchesBook,
  resolveReportExcludedBookIds,
  resolveReportBookMode,
  resolveReportSavedBookIds,
  resolveReportSpecificBookIds,
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

const reportBookModeTabs = [
  {
    key: 'single',
    label: '选择指定图书',
    description: '可选择一本或多本指定图书，冲突规则按每本书分别校验。',
  },
  {
    key: 'all',
    label: '选择所有书',
    description: '保存当前书目名单中的所有图书 ID，备注默认为“推广所有图书”。',
  },
  {
    key: 'exclude',
    label: '只排除某些书',
    description: '选择不推广的图书，提交时保存未被排除的所有图书 ID。',
  },
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

const {
  selectedIds,
  clearSelections,
  clearAllSelections,
  isSelected,
  toggleRowSelection,
  areAllSelected,
  toggleAllSelection,
} = useRowSelection(['schools', 'books', 'promoters', 'reports'])

const { importPreview, handleImport, closeImportPreview, confirmImport } = useRegistryImport({
  kindLabels,
  previewColumnsByKind,
  runAction,
  clearSelections,
  setMessage,
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
    const specificBooks = bookMode === 'single' ? resolveReportSpecificBooks(report) : []
    const excludedBooks = resolveReportExcludedBooks(report)

    return {
      ...report,
      bookMode,
      bookIds:
        bookMode === 'single'
          ? resolveReportSpecificBookIds(report)
          : resolveReportSavedBookIds(report, store.state.books),
      province: school?.province || '',
      schoolName: school?.name || '学校已删除',
      schoolLabel: school ? `${school.province} / ${school.name}` : '学校已删除',
      bookTitle: specificBooks.map((book) => book.title).join('、') || '书目已删除',
      isbn: specificBooks.map((book) => book.isbn).join('、'),
      bookLabel: formatReportBookLabel(bookMode, specificBooks, excludedBooks),
      bookSearchText: formatReportBookSearchText(bookMode, specificBooks, excludedBooks),
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

const { pages, pageRows } = usePagedLists(
  {
    schools: schoolFiltered,
    books: bookFiltered,
    promoters: promoterFiltered,
    reports: reportFiltered,
  },
  search,
  PAGE_SIZE,
)

const schoolPageRows = pageRows.schools
const bookPageRows = pageRows.books
const promoterPageRows = pageRows.promoters
const reportPageRows = pageRows.reports

const reportConflictDetails = computed(() =>
  findReportConflicts(
    store.state.reports,
    buildReportConflictPayload(),
    editing.reportId,
    store.state.books,
  ).flatMap(({ report, bookIds }) => {
    const school = store.state.schools.find((item) => item.id === report.schoolId)
    const promoter = store.state.promoters.find((item) => item.id === report.promoterId)
    return bookIds.map((bookId) => ({
      key: `${report.id}-${bookId}`,
      bookLabel: formatBookById(bookId),
      term: resolveReportTerm(report),
      schoolLabel: school ? `${school.province} / ${school.name}` : '学校已删除',
      promoterLabel: promoter?.name || '其他推广商',
    }))
  }),
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
    if (reportForm.bookMode === 'single' && reportForm.bookIds.length) {
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
  if (reportForm.bookMode === 'single' && !reportForm.bookIds.length) {
    reportValidationErrors.bookId = '请选择要推广的书目。'
  }
  if (reportForm.bookMode === 'all' && !store.state.books.length) {
    reportValidationErrors.bookIds = '当前书目名单为空，无法选择所有书。'
  }
  if (reportForm.bookMode === 'exclude' && !reportForm.bookIds.length) {
    reportValidationErrors.bookIds = '请选择需要排除的书目。'
  }
  if (
    reportForm.bookMode === 'exclude' &&
    reportForm.bookIds.length > 0 &&
    reportForm.bookIds.length >= store.state.books.length
  ) {
    reportValidationErrors.bookIds = '排除后没有可报备的书目，请至少保留一本图书。'
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

function selectReportBookMode(mode) {
  if (reportForm.bookMode === mode) return
  reportForm.bookMode = mode
  reportForm.bookId = ''
  reportForm.bookIds = []
  reportValidationErrors.bookId = ''
  reportValidationErrors.bookIds = ''
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
    reportForm.bookIds =
      reportForm.bookMode === 'single'
        ? resolveReportSpecificBookIds(report)
        : reportForm.bookMode === 'exclude'
          ? resolveReportExcludedBookIds(report, store.state.books)
          : []
    reportForm.bookId = reportForm.bookMode === 'single' ? reportForm.bookIds[0] || '' : ''
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
  const payload = buildReportFormPayload()
  const conflicts = reportConflictDetails.value
  if (conflicts.length) {
    message.text = ''
    showReportError(formatReportConflictMessage(conflicts), isEditing ? '修改报备失败' : '新增报备失败')
    return
  }

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

function deleteSchool(school) {
  runAction(() => api.deleteSchool(school.id), '学校已删除，并同步更新 JSON 文件。')
}

function deleteBook(book) {
  runAction(() => api.deleteBook(book.id), '书目已删除，并同步更新 JSON 文件。')
}

function deletePromoter(promoter) {
  runAction(() => api.deletePromoter(promoter.id), '推广商已删除，并同步更新 JSON 文件。')
}

function deleteReport(report) {
  runAction(() => api.deleteReport(report.id), '报备记录已删除，并同步更新 JSON 文件。')
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
  const ids = resolveReportExcludedBookIds(report, store.state.books)
  return ids
    .map((id) => store.state.books.find((book) => book.id === id))
    .filter(Boolean)
}

function resolveReportSpecificBooks(report) {
  return resolveReportSpecificBookIds(report)
    .map((id) => store.state.books.find((book) => book.id === id))
    .filter(Boolean)
}

function formatBookOption(book) {
  return book ? `${book.title} (${book.isbn})` : '书目已删除'
}

function formatBookById(bookId) {
  return formatBookOption(store.state.books.find((book) => book.id === bookId))
}

function formatReportConflictMessage(conflicts) {
  return [
    '该学校当前学期已有图书被报备，不允许重复报备同一本书。',
    '重复书目如下：',
    ...conflicts.map(
      (item) =>
        `- ${item.bookLabel}：已在 ${item.term}，${item.schoolLabel} 由 ${item.promoterLabel} 报备过`,
    ),
  ].join('\n')
}

function formatReportBookLabel(bookMode, specificBooks, excludedBooks) {
  if (bookMode === 'all') return '所有图书'
  if (bookMode === 'exclude') {
    if (!excludedBooks.length) return '排除指定图书'
    return `排除 ${excludedBooks.length} 本：${excludedBooks.map(formatBookOption).join('、')}`
  }
  if (!specificBooks.length) return '书目已删除'
  if (specificBooks.length === 1) return formatBookOption(specificBooks[0])
  return `指定 ${specificBooks.length} 本：${specificBooks.map(formatBookOption).join('、')}`
}

function formatReportBookSearchText(bookMode, specificBooks, excludedBooks) {
  if (bookMode === 'all') return '所有图书 推广所有图书'
  if (bookMode === 'exclude') {
    return `排除指定图书 只有所选图书不推广 ${excludedBooks.map(formatBookOption).join(' ')}`
  }
  return specificBooks.length
    ? `指定图书 ${specificBooks.map((book) => `${book.title} ${book.isbn}`).join(' ')}`
    : '书目已删除'
}

function buildReportFormPayload() {
  return {
    schoolId: reportForm.schoolId,
    bookMode: reportForm.bookMode,
    bookId: reportForm.bookIds[0] || reportForm.bookId,
    bookIds: reportForm.bookIds,
    promoterId: reportForm.promoterId,
    term: reportForm.term,
    note: reportForm.note,
  }
}

function buildReportConflictPayload() {
  return normalizeReportPayload(buildReportFormPayload(), store.state.books)
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

const { exportRows, exportAnalytics, exportAnalyticsDetail } = useRegistryExport({
  kindLabels,
  filteredRowsByKind: {
    schools: schoolFiltered,
    books: bookFiltered,
    promoters: promoterFiltered,
    reports: reportFiltered,
  },
  selectedIds,
  analyticsReportRows,
  analyticsDetail,
  getAgencyRecords,
  formatAgencyRecordsText,
  formatTime,
  setMessage,
})

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

function openAnalyticsStatDetail({ title, field, value }) {
  openAnalyticsDetail(title, analyticsRowsBy(field, value))
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

    <SchoolsTab
      v-if="activeTab === 'schools'"
      :busy="busy"
      :search="search"
      :selected-ids="selectedIds"
      :page-rows="schoolPageRows"
      :filtered-count="schoolFiltered.length"
      :page="pages.schools"
      :page-size="PAGE_SIZE"
      :is-selected="isSelected"
      :are-all-selected="areAllSelected"
      @update:page="pages.schools = $event"
      @create="openSchoolModal()"
      @edit="openSchoolModal"
      @delete="deleteSchool"
      @import="handleImport('schools', $event)"
      @export="(selectedOnly) => exportRows('schools', selectedOnly)"
      @batch-delete="batchDelete('schools')"
      @toggle-row="({ id, checked }) => toggleRowSelection('schools', id, checked)"
      @toggle-all="(checked) => toggleAllSelection('schools', schoolPageRows, checked)"
    />

    <BooksTab
      v-if="activeTab === 'books'"
      :busy="busy"
      :search="search"
      :selected-ids="selectedIds"
      :page-rows="bookPageRows"
      :filtered-count="bookFiltered.length"
      :page="pages.books"
      :page-size="PAGE_SIZE"
      :is-selected="isSelected"
      :are-all-selected="areAllSelected"
      @update:page="pages.books = $event"
      @create="openBookModal()"
      @edit="openBookModal"
      @delete="deleteBook"
      @import="handleImport('books', $event)"
      @export="(selectedOnly) => exportRows('books', selectedOnly)"
      @batch-delete="batchDelete('books')"
      @toggle-row="({ id, checked }) => toggleRowSelection('books', id, checked)"
      @toggle-all="(checked) => toggleAllSelection('books', bookPageRows, checked)"
    />

    <PromotersTab
      v-if="activeTab === 'promoters'"
      :busy="busy"
      :search="search"
      :selected-ids="selectedIds"
      :page-rows="promoterPageRows"
      :filtered-count="promoterFiltered.length"
      :page="pages.promoters"
      :page-size="PAGE_SIZE"
      :is-selected="isSelected"
      :are-all-selected="areAllSelected"
      :get-agency-records="getAgencyRecords"
      :latest-agency-record="latestAgencyRecord"
      :promoter-territory-text="promoterTerritoryText"
      @update:page="pages.promoters = $event"
      @create="openPromoterModal()"
      @edit="openPromoterModal"
      @delete="deletePromoter"
      @import="handleImport('promoters', $event)"
      @export="(selectedOnly) => exportRows('promoters', selectedOnly)"
      @batch-delete="batchDelete('promoters')"
      @toggle-row="({ id, checked }) => toggleRowSelection('promoters', id, checked)"
      @toggle-all="(checked) => toggleAllSelection('promoters', promoterPageRows, checked)"
    />

    <ReportsTab
      v-if="activeTab === 'reports'"
      :busy="busy"
      :search="search"
      :selected-ids="selectedIds"
      :page-rows="reportPageRows"
      :filtered-count="reportFiltered.length"
      :page="pages.reports"
      :page-size="PAGE_SIZE"
      :is-selected="isSelected"
      :are-all-selected="areAllSelected"
      :format-time="formatTime"
      @update:page="pages.reports = $event"
      @create="openReportModal()"
      @edit="openReportModal"
      @delete="deleteReport"
      @export="(selectedOnly) => exportRows('reports', selectedOnly)"
      @batch-delete="batchDelete('reports')"
      @toggle-row="({ id, checked }) => toggleRowSelection('reports', id, checked)"
      @toggle-all="(checked) => toggleAllSelection('reports', reportPageRows, checked)"
    />

    <AnalyticsTab
      v-if="activeTab === 'analytics'"
      :filters="analyticsFilters"
      :term-options="termOptions"
      :provinces="PROVINCES"
      :promoters="store.state.promoters"
      :books="store.state.books"
      :report-rows="analyticsReportRows"
      :province-stats="provinceStats"
      :promoter-stats="promoterStats"
      :book-stats="bookStats"
      @export="exportAnalytics"
      @open-detail="openAnalyticsStatDetail"
    />
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
        <ReportBookSelector
          :book-mode="reportForm.bookMode"
          :book-ids="reportForm.bookIds"
          :modes="reportBookModeTabs"
          :book-options="bookOptions"
          :book-id-error="reportValidationErrors.bookId"
          :book-ids-error="reportValidationErrors.bookIds"
          @select-mode="selectReportBookMode"
          @update:book-ids="reportForm.bookIds = $event"
        />
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
        <div v-if="reportConflictDetails.length" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>所选书目中已有 {{ reportConflictDetails.length }} 本被报备，系统会阻止重复提交。</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li v-for="item in reportConflictDetails" :key="item.key">
              <span class="font-semibold">{{ item.bookLabel }}</span>
              已在 {{ item.term }}，{{ item.schoolLabel }} 由 {{ item.promoterLabel }} 报备过。
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <button type="button" class="secondary-button" :disabled="busy" @click="closeReportModal">取消</button>
        <button type="button" class="primary-button" :disabled="busy" @click="submitReport">{{ editing.reportId ? '保存修改' : '确认新增' }}</button>
      </template>
    </ModalPanel>

    <ModalPanel :visible="modal.reportError" :title="reportError.title" max-width-class="max-w-md" @close="closeReportError">
      <p class="whitespace-pre-line text-sm leading-6 text-red-700">{{ reportError.text }}</p>
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
