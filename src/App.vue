<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AnalyticsDetailModal from './components/AnalyticsDetailModal.vue'
import AnalyticsTab from './components/AnalyticsTab.vue'
import BookModal from './components/BookModal.vue'
import BooksTab from './components/BooksTab.vue'
import ImportPreviewModal from './components/ImportPreviewModal.vue'
import ModalPanel from './components/ModalPanel.vue'
import PromoterModal from './components/PromoterModal.vue'
import PromotersTab from './components/PromotersTab.vue'
import ReportModal from './components/ReportModal.vue'
import ReportsTab from './components/ReportsTab.vue'
import SchoolModal from './components/SchoolModal.vue'
import SchoolsTab from './components/SchoolsTab.vue'
import { useActionRunner } from './composables/useActionRunner'
import { useRegistryAnalytics } from './composables/useRegistryAnalytics'
import { useRegistryImport } from './composables/useRegistryImport'
import { usePagedLists } from './composables/usePagedLists'
import { useRegistryStore } from './composables/useRegistryStore'
import { useRegistryExport } from './composables/useRegistryExport'
import { useRowSelection } from './composables/useRowSelection'
import { PROVINCES } from './constants/provinces'
import { api, getErrorMessage } from './utils/api'
import {
  formatAgencyRecordsText,
  normalizeAgencyRecords as getAgencyRecords,
} from './utils/promoterAgencyRecords'
import { buildPromoterViewModels } from './utils/promoterViewModels'
import { buildReportViewModel } from './utils/reportViewModels'

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

const reportError = reactive({
  title: '',
  text: '',
})

const selectedSchool = ref(null)
const selectedBook = ref(null)
const selectedPromoter = ref(null)
const selectedReport = ref(null)

const {
  selectedIds,
  clearSelections,
  clearAllSelections,
  isSelected,
  toggleRowSelection,
  areAllSelected,
  toggleAllSelection,
} = useRowSelection(['schools', 'books', 'promoters', 'reports'])

const { runAction: runRegistryAction } = useActionRunner({
  busy,
  refresh: store.refresh,
  clearAllSelections,
  setMessage,
})

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

const joinedPromoters = computed(() => buildPromoterViewModels(store.state.promoters))

const promoterOptions = computed(() =>
  joinedPromoters.value.map((promoter) => ({
    id: promoter.id,
    label: promoter.name,
    keywords: promoter.searchText,
    meta: `${promoter.contact || '未填写联系人'} / ${promoter.phone || '未填写电话'}`,
  })),
)

const joinedReports = computed(() =>
  store.state.reports.map((report) =>
    buildReportViewModel(report, {
      schools: store.state.schools,
      books: store.state.books,
      promoters: store.state.promoters,
    }),
  ),
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
  if (!keyword) return joinedPromoters.value
  return joinedPromoters.value.filter((item) => item.searchText.includes(keyword))
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

const {
  analyticsFilters,
  analyticsDetail,
  analyticsReportRows,
  provinceStats,
  promoterStats,
  bookStats,
  openAnalyticsStatDetail,
  closeAnalyticsDetail,
} = useRegistryAnalytics(joinedReports)

function setMessage(text, type = 'success') {
  message.text = text
  message.type = type
}

function runAction(action, successText, afterSuccess) {
  return runRegistryAction(action, { successText, afterSuccess })
}

function closeSchoolModal() {
  modal.school = false
  selectedSchool.value = null
}

function closeBookModal() {
  modal.book = false
  selectedBook.value = null
}

function closePromoterModal() {
  modal.promoter = false
  selectedPromoter.value = null
}

function closeReportModal() {
  modal.report = false
  closeReportError()
  selectedReport.value = null
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
  selectedSchool.value = school
  modal.school = true
}

function openBookModal(book = null) {
  selectedBook.value = book
  modal.book = true
}

function openPromoterModal(promoter = null) {
  selectedPromoter.value = promoter
  modal.promoter = true
}

function openReportModal(report = null) {
  closeReportError()
  selectedReport.value = report
  modal.report = true
}

function submitSchool(payload) {
  const school = selectedSchool.value
  const isEditing = Boolean(school)
  runAction(
    () => (isEditing ? api.updateSchool(school.id, payload) : api.createSchool(payload)),
    isEditing ? '学校已修改，并同步写入 Supabase。' : '学校名单已写入 Supabase。',
    closeSchoolModal,
  )
}

function submitBook(payload) {
  const book = selectedBook.value
  const isEditing = Boolean(book)
  runAction(
    () => (isEditing ? api.updateBook(book.id, payload) : api.createBook(payload)),
    isEditing ? '书目已修改，并同步写入 Supabase。' : '书目名单已写入 Supabase。',
    closeBookModal,
  )
}

function submitPromoter(payload) {
  const promoter = selectedPromoter.value
  const isEditing = Boolean(promoter)
  runAction(
    () => (isEditing ? api.updatePromoter(promoter.id, payload) : api.createPromoter(payload)),
    isEditing ? '推广商已修改，并同步写入 Supabase。' : '推广商名单已写入 Supabase。',
    closePromoterModal,
  )
}

function submitReport(payload) {
  const report = selectedReport.value
  const isEditing = Boolean(report)
  closeReportError()
  return runRegistryAction(
    () => (isEditing ? api.updateReport(report.id, payload) : api.createReport(payload)),
    {
      successText: isEditing ? '报备记录已修改，并同步写入 Supabase。' : '报备成功，记录已写入 Supabase。',
      afterSuccess: closeReportModal,
      onError: (error) =>
        showReportError(
          getErrorMessage(error, '报备提交失败，请稍后重试。'),
          isEditing ? '修改报备失败' : '新增报备失败',
        ),
    },
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
    `已批量删除 ${ids.length} 条${kindLabels[kind]}数据，并同步更新 Supabase。`,
    () => clearSelections(kind),
  )
}

function deleteSchool(school) {
  runAction(() => api.deleteSchool(school.id), '学校已删除，并同步更新 Supabase。')
}

function deleteBook(book) {
  runAction(() => api.deleteBook(book.id), '书目已删除，并同步更新 Supabase。')
}

function deletePromoter(promoter) {
  runAction(() => api.deletePromoter(promoter.id), '推广商已删除，并同步更新 Supabase。')
}

function deleteReport(report) {
  runAction(() => api.deleteReport(report.id), '报备记录已删除，并同步更新 Supabase。')
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

function openAnalyticsDetailModal(payload) {
  openAnalyticsStatDetail(payload)
  modal.analyticsDetail = true
}

function closeAnalyticsDetailModal() {
  closeAnalyticsDetail()
  modal.analyticsDetail = false
}

onMounted(async () => {
  try {
    await store.refresh()
  } catch (error) {
    setMessage(`初始化失败：${getErrorMessage(error)}`, 'error')
  }
})
</script>

<template>
  <div class="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <UCard :ui="{ body: 'p-6 lg:p-8' }">
      <UBadge color="primary" variant="soft">Supabase 持久化 / 搜索 / 分页 / 批量导出</UBadge>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight text-sand-900 sm:text-4xl">
        出版社推广商报备系统
      </h1>
      <p class="mt-4 max-w-4xl text-sm leading-7 text-sand-700 sm:text-base">
        所有数据统一保存到 Supabase。
        同一个学校的同一个书目在同一个学期只能由一个推广商报备。
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          :color="activeTab === tab.key ? 'primary' : 'neutral'"
          :variant="activeTab === tab.key ? 'solid' : 'soft'"
          size="sm"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </UButton>
      </div>
    </UCard>

    <UAlert
      v-if="message.text"
      class="mt-6"
      :color="message.type === 'error' ? 'error' : 'success'"
      :variant="'soft'"
      :icon="message.type === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-circle-check'"
      :description="message.text"
    />

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
      @open-detail="openAnalyticsDetailModal"
    />
    <SchoolModal
      :visible="modal.school"
      :busy="busy"
      :school="selectedSchool"
      :provinces="PROVINCES"
      @close="closeSchoolModal"
      @submit="submitSchool"
    />

    <BookModal
      :visible="modal.book"
      :busy="busy"
      :book="selectedBook"
      @close="closeBookModal"
      @submit="submitBook"
    />

    <PromoterModal
      :visible="modal.promoter"
      :busy="busy"
      :promoter="selectedPromoter"
      :provinces="PROVINCES"
      @close="closePromoterModal"
      @submit="submitPromoter"
    />

    <ReportModal
      :visible="modal.report"
      :busy="busy"
      :report="selectedReport"
      :reports="store.state.reports"
      :books="store.state.books"
      :schools="store.state.schools"
      :promoters="store.state.promoters"
      :school-options="schoolOptions"
      :book-options="bookOptions"
      :promoter-options="promoterOptions"
      :term-options="termOptions"
      :modes="reportBookModeTabs"
      @close="closeReportModal"
      @submit="submitReport"
      @report-error="showReportError"
    />

    <ModalPanel :visible="modal.reportError" :title="reportError.title" max-width-class="max-w-md" @close="closeReportError">
      <p class="whitespace-pre-line text-sm leading-6 text-red-700">{{ reportError.text }}</p>
      <template #footer>
        <UButton @click="closeReportError">知道了</UButton>
      </template>
    </ModalPanel>

    <AnalyticsDetailModal
      :visible="modal.analyticsDetail"
      :title="analyticsDetail.title"
      :rows="analyticsDetail.rows"
      :format-time="formatTime"
      @close="closeAnalyticsDetailModal"
      @export="exportAnalyticsDetail"
    />

    <ImportPreviewModal
      :visible="importPreview.visible"
      :busy="busy"
      :preview="importPreview"
      :kind-labels="kindLabels"
      @close="closeImportPreview"
      @confirm="confirmImport"
    />
  </div>
</template>
