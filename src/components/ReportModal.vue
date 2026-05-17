<script setup>
import { computed, reactive, watch } from 'vue'
import ModalPanel from './ModalPanel.vue'
import ReportBookSelector from './ReportBookSelector.vue'
import SearchSelect from './SearchSelect.vue'
import {
  findReportConflicts,
  normalizeReportPayload,
  normalizeTermText,
  resolveReportBookMode,
  resolveReportExcludedBookIds,
  resolveReportSpecificBookIds,
  resolveReportTerm,
} from '#shared/reportRules.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  report: {
    type: Object,
    default: null,
  },
  reports: {
    type: Array,
    default: () => [],
  },
  books: {
    type: Array,
    default: () => [],
  },
  schools: {
    type: Array,
    default: () => [],
  },
  promoters: {
    type: Array,
    default: () => [],
  },
  schoolOptions: {
    type: Array,
    default: () => [],
  },
  bookOptions: {
    type: Array,
    default: () => [],
  },
  promoterOptions: {
    type: Array,
    default: () => [],
  },
  termOptions: {
    type: Array,
    default: () => [],
  },
  modes: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'submit', 'report-error'])

const form = reactive({
  schoolId: '',
  bookMode: 'single',
  bookId: '',
  bookIds: [],
  promoterId: '',
  term: '',
  note: '',
})

const errors = reactive({
  term: '',
  schoolId: '',
  bookId: '',
  bookIds: '',
  promoterId: '',
})

const reportConflictDetails = computed(() =>
  findReportConflicts(
    props.reports,
    buildConflictPayload(),
    props.report?.id || '',
    props.books,
  ).flatMap(({ report, bookIds }) => {
    const school = props.schools.find((item) => item.id === report.schoolId)
    const promoter = props.promoters.find((item) => item.id === report.promoterId)
    return bookIds.map((bookId) => ({
      key: `${report.id}-${bookId}`,
      bookLabel: formatBookById(bookId),
      term: resolveReportTerm(report),
      schoolLabel: school ? `${school.province} / ${school.name}` : '学校已删除',
      promoterLabel: promoter?.name || '其他推广商',
    }))
  }),
)

watch(
  () => [props.visible, props.report],
  () => {
    if (props.visible) resetForm()
  },
  { immediate: true },
)

watch(
  () => form.term,
  (value) => {
    if (normalizeTermText(value)) errors.term = ''
  },
)
watch(
  () => form.schoolId,
  (value) => {
    if (value) errors.schoolId = ''
  },
)
watch(
  () => [form.bookMode, form.bookIds.length],
  () => {
    if (form.bookMode === 'all') {
      errors.bookId = ''
      errors.bookIds = ''
      return
    }
    if (form.bookMode === 'single' && form.bookIds.length) {
      errors.bookId = ''
    }
    if (form.bookMode === 'exclude' && form.bookIds.length) {
      errors.bookIds = ''
    }
  },
)
watch(
  () => form.promoterId,
  (value) => {
    if (value) errors.promoterId = ''
  },
)

function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
}

function resetForm() {
  clearErrors()
  if (props.report) {
    form.schoolId = props.report.schoolId
    form.bookMode = resolveReportBookMode(props.report)
    form.bookIds =
      form.bookMode === 'single'
        ? resolveReportSpecificBookIds(props.report)
        : form.bookMode === 'exclude'
          ? resolveReportExcludedBookIds(props.report, props.books)
          : []
    form.bookId = form.bookMode === 'single' ? form.bookIds[0] || '' : ''
    form.promoterId = props.report.promoterId
    form.term = resolveReportTerm(props.report)
    form.note = props.report.note || ''
    return
  }

  form.schoolId = ''
  form.bookMode = 'single'
  form.bookId = ''
  form.bookIds = []
  form.promoterId = ''
  form.term = ''
  form.note = ''
}

function selectBookMode(mode) {
  if (form.bookMode === mode) return
  form.bookMode = mode
  form.bookId = ''
  form.bookIds = []
  errors.bookId = ''
  errors.bookIds = ''
}

function validateForm() {
  clearErrors()

  if (!normalizeTermText(form.term)) {
    errors.term = '请填写报备学期。'
  }
  if (!form.schoolId) {
    errors.schoolId = '请选择学校。'
  }
  if (form.bookMode === 'single' && !form.bookIds.length) {
    errors.bookId = '请选择要推广的书目。'
  }
  if (form.bookMode === 'all' && !props.books.length) {
    errors.bookIds = '当前书目名单为空，无法选择所有书。'
  }
  if (form.bookMode === 'exclude' && !form.bookIds.length) {
    errors.bookIds = '请选择需要排除的书目。'
  }
  if (form.bookMode === 'exclude' && form.bookIds.length > 0 && form.bookIds.length >= props.books.length) {
    errors.bookIds = '排除后没有可报备的书目，请至少保留一本图书。'
  }
  if (!form.promoterId) {
    errors.promoterId = '请选择推广商。'
  }

  return !Object.values(errors).some(Boolean)
}

function buildPayload() {
  return {
    schoolId: form.schoolId,
    bookMode: form.bookMode,
    bookId: form.bookIds[0] || form.bookId,
    bookIds: form.bookIds,
    promoterId: form.promoterId,
    term: form.term,
    note: form.note,
  }
}

function buildConflictPayload() {
  return normalizeReportPayload(buildPayload(), props.books)
}

function formatBookById(bookId) {
  const book = props.books.find((item) => item.id === bookId)
  return book ? `${book.title} (${book.isbn})` : '书目已删除'
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

function submit() {
  form.term = normalizeTermText(form.term)
  if (!validateForm()) return

  const conflicts = reportConflictDetails.value
  if (conflicts.length) {
    emit(
      'report-error',
      formatReportConflictMessage(conflicts),
      props.report ? '修改报备失败' : '新增报备失败',
    )
    return
  }

  emit('submit', buildPayload())
}
</script>

<template>
  <ModalPanel
    :visible="visible"
    :title="report ? '修改报备' : '新增报备'"
    max-width-class="max-w-4xl"
    @close="emit('close')"
  >
    <div class="grid gap-4">
      <div>
        <label class="label-text">报备学期</label>
        <input
          v-model="form.term"
          class="field-input"
          :class="{ 'field-input-error': errors.term }"
          type="text"
          list="report-term-options"
          placeholder="例如：2026年春 或 2026年秋"
          :aria-invalid="errors.term ? 'true' : 'false'"
        />
        <datalist id="report-term-options">
          <option v-for="term in termOptions" :key="term" :value="term" />
        </datalist>
        <p v-if="errors.term" class="field-error-text">{{ errors.term }}</p>
      </div>
      <div>
        <label class="label-text">学校</label>
        <SearchSelect
          v-model="form.schoolId"
          :options="schoolOptions"
          placeholder="输入省份或学校名称"
          empty-text="未匹配到学校"
          :invalid="Boolean(errors.schoolId)"
        />
        <p v-if="errors.schoolId" class="field-error-text">{{ errors.schoolId }}</p>
      </div>
      <ReportBookSelector
        :book-mode="form.bookMode"
        :book-ids="form.bookIds"
        :modes="modes"
        :book-options="bookOptions"
        :book-id-error="errors.bookId"
        :book-ids-error="errors.bookIds"
        @select-mode="selectBookMode"
        @update:book-ids="form.bookIds = $event"
      />
      <div>
        <label class="label-text">推广商</label>
        <SearchSelect
          v-model="form.promoterId"
          :options="promoterOptions"
          placeholder="输入推广商、联系人或电话"
          empty-text="未匹配到推广商"
          :invalid="Boolean(errors.promoterId)"
        />
        <p v-if="errors.promoterId" class="field-error-text">{{ errors.promoterId }}</p>
      </div>
      <div>
        <label class="label-text">备注</label>
        <textarea v-model="form.note" class="field-input min-h-24" placeholder="可选"></textarea>
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
      <button type="button" class="secondary-button" :disabled="busy" @click="emit('close')">取消</button>
      <button type="button" class="primary-button" :disabled="busy" @click="submit">
        {{ report ? '保存修改' : '确认新增' }}
      </button>
    </template>
  </ModalPanel>
</template>
