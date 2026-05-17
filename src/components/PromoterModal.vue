<script setup>
import { computed, reactive, watch } from 'vue'
import ModalPanel from './ModalPanel.vue'
import {
  cloneAgencyRecords,
  cloneTerritories,
  formatTerritoryText,
  normalizeAgencyRecords,
} from '../utils/promoterAgencyRecords'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  promoter: {
    type: Object,
    default: null,
  },
  provinces: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'submit'])

const provinceOptions = computed(() => [
  { label: '请选择省份', value: '' },
  ...props.provinces.map((province) => ({ label: province, value: province })),
])

const acceptingOptions = [
  { label: '接单', value: true },
  { label: '不接单', value: false },
]

const CURRENT_YEAR = new Date().getFullYear()

const form = reactive({
  name: '',
  contact: '',
  phone: '',
  agencyRecordId: '',
  agencyRecordYear: String(CURRENT_YEAR),
  agencyPeriod: '',
  workload: '',
  province: '',
  accepting: true,
  territories: [],
  agencyRecords: [],
})
const localError = reactive({ text: '' })

function resetAgencyDraft() {
  form.agencyRecordId = ''
  form.agencyRecordYear = String(CURRENT_YEAR)
  form.agencyPeriod = ''
  form.workload = ''
  form.province = ''
  form.accepting = true
  form.territories = []
}

function resetForm() {
  form.name = props.promoter?.name || ''
  form.contact = props.promoter?.contact || ''
  form.phone = props.promoter?.phone || ''
  form.agencyRecords = props.promoter
    ? normalizeAgencyRecords(props.promoter, { currentYear: CURRENT_YEAR })
    : []
  localError.text = ''
  resetAgencyDraft()
}

watch(
  () => [props.visible, props.promoter],
  () => {
    if (props.visible) resetForm()
  },
  { immediate: true },
)

function setLocalError(text) {
  localError.text = text
}

function addTerritory() {
  if (!form.province) {
    setLocalError('请先选择代理省份。')
    return
  }

  const existing = form.territories.find((item) => item.province === form.province)
  if (existing) {
    existing.accepting = form.accepting
  } else {
    form.territories.push({
      province: form.province,
      accepting: form.accepting,
    })
  }

  form.province = ''
  form.accepting = true
  localError.text = ''
}

function saveAgencyRecord() {
  if (!form.agencyRecordYear) {
    setLocalError('请填写代理年度。')
    return
  }

  const record = {
    id: form.agencyRecordId || `agency_${Date.now()}`,
    year: form.agencyRecordYear,
    agencyPeriod: form.agencyPeriod,
    workload: form.workload,
    territories: cloneTerritories(form.territories),
  }

  const duplicateYear = form.agencyRecords.find(
    (item) => item.id !== form.agencyRecordId && item.year === record.year,
  )
  if (duplicateYear) {
    setLocalError('同一推广商同一年只能保留一条代理记录。')
    return
  }

  if (form.agencyRecordId) {
    form.agencyRecords = form.agencyRecords.map((item) =>
      item.id === form.agencyRecordId ? record : item,
    )
  } else {
    form.agencyRecords.push(record)
  }

  form.agencyRecords.sort((a, b) => Number(b.year) - Number(a.year))
  localError.text = ''
  resetAgencyDraft()
}

function editAgencyRecord(record) {
  form.agencyRecordId = record.id
  form.agencyRecordYear = record.year
  form.agencyPeriod = record.agencyPeriod
  form.workload = record.workload
  form.province = ''
  form.accepting = true
  form.territories = cloneTerritories(record.territories)
  localError.text = ''
}

function removeAgencyRecord(recordId) {
  form.agencyRecords = form.agencyRecords.filter((item) => item.id !== recordId)
  if (form.agencyRecordId === recordId) {
    resetAgencyDraft()
  }
}

function removeTerritory(province) {
  form.territories = form.territories.filter((item) => item.province !== province)
}

function submit() {
  if (!form.agencyRecords.length) {
    setLocalError('请至少添加一条年度代理记录。')
    return
  }

  emit('submit', {
    name: form.name,
    contact: form.contact,
    phone: form.phone,
    agencyRecords: cloneAgencyRecords(form.agencyRecords),
  })
}
</script>

<template>
  <ModalPanel
    :visible="visible"
    :title="promoter ? '修改推广商' : '新增推广商'"
    max-width-class="max-w-5xl"
    @close="emit('close')"
  >
    <template #description>
      <p class="mt-2 text-sm text-sand-600">代理配置按年度保存，同一推广商同一年仅保留一条记录。</p>
    </template>
    <div class="grid gap-4">
      <UAlert
        v-if="localError.text"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :description="localError.text"
      />
      <div>
        <label class="label-text">推广商名称</label>
        <UInput v-model="form.name" class="w-full" type="text" placeholder="例如：华东教育推广中心" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label-text">联系人</label>
          <UInput v-model="form.contact" class="w-full" type="text" placeholder="联系人姓名" />
        </div>
        <div>
          <label class="label-text">联系电话</label>
          <UInput v-model="form.phone" class="w-full" type="text" placeholder="手机号或座机" />
        </div>
      </div>
      <div class="grid gap-4 rounded-lg border border-sand-200 bg-sand-50 p-4 sm:p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 class="text-base font-semibold text-sand-900">年度代理记录</h4>
            <p class="mt-1 text-sm text-sand-600">先编辑某一年度的代理信息，再加入下方历史记录列表。</p>
          </div>
          <span class="tag">{{ form.agencyRecords.length }} 条历史记录</span>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <div>
            <label class="label-text">代理年度</label>
            <UInput v-model="form.agencyRecordYear" class="w-full" type="number" min="2000" max="2100" placeholder="例如：2026" />
          </div>
          <div>
            <label class="label-text">代理期间</label>
            <UInput v-model="form.agencyPeriod" class="w-full" type="text" placeholder="例如：2026.01-2026.12" />
          </div>
          <div>
            <label class="label-text">任务量</label>
            <UInput v-model="form.workload" class="w-full" type="text" placeholder="例如：年度目标 50 校" />
          </div>
        </div>
        <div class="rounded-lg border border-sand-200 bg-white p-4">
          <div class="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label class="label-text">代理省份</label>
              <USelect v-model="form.province" class="w-full" :items="provinceOptions" />
            </div>
            <div>
              <label class="label-text">是否接单</label>
              <USelect v-model="form.accepting" class="w-full" :items="acceptingOptions" />
            </div>
            <UButton class="justify-center" color="neutral" variant="soft" icon="i-lucide-plus" @click="addTerritory">添加省份</UButton>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <div
              v-for="territory in form.territories"
              :key="territory.province"
              class="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-2 text-sm text-sand-800"
            >
              <span>{{ territory.province }} / {{ territory.accepting ? '接单' : '不接单' }}</span>
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" square @click="removeTerritory(territory.province)" />
            </div>
            <div v-if="!form.territories.length" class="text-sm text-sand-500">当前年度还没有配置代理省份</div>
          </div>
        </div>
        <div class="grid gap-3 sm:flex sm:flex-wrap">
          <UButton class="justify-center" color="neutral" variant="soft" icon="i-lucide-save" @click="saveAgencyRecord">
            {{ form.agencyRecordId ? '保存年度记录' : '加入年度记录' }}
          </UButton>
          <UButton class="justify-center" color="neutral" variant="soft" icon="i-lucide-eraser" @click="resetAgencyDraft">清空当前年度</UButton>
        </div>
        <div class="grid gap-3 sm:hidden">
          <article
            v-for="record in form.agencyRecords"
            :key="record.id"
            class="rounded-lg border border-sand-200 bg-white p-4"
          >
            <p class="font-semibold text-sand-900">{{ record.year }}年</p>
            <dl class="mt-3 grid gap-3 text-sm">
              <div class="grid gap-1">
                <dt class="text-sand-500">代理省份配置</dt>
                <dd class="break-words leading-6 text-sand-700">{{ formatTerritoryText(record.territories) }}</dd>
              </div>
              <div class="grid gap-1">
                <dt class="text-sand-500">代理期间</dt>
                <dd class="text-sand-900">{{ record.agencyPeriod || '-' }}</dd>
              </div>
              <div class="grid gap-1">
                <dt class="text-sand-500">任务量</dt>
                <dd class="text-sand-900">{{ record.workload || '-' }}</dd>
              </div>
            </dl>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <UButton size="sm" color="neutral" variant="soft" class="justify-center" @click="editAgencyRecord(record)">编辑</UButton>
              <UButton size="sm" color="error" variant="soft" class="justify-center" @click="removeAgencyRecord(record.id)">删除</UButton>
            </div>
          </article>
          <div v-if="!form.agencyRecords.length" class="rounded-lg border border-dashed border-sand-200 py-8 text-center text-sm text-sand-500">
            还没有保存年度代理记录
          </div>
        </div>
        <div class="hidden overflow-x-auto sm:block">
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
              <tr v-for="record in form.agencyRecords" :key="record.id" class="border-b border-sand-100 align-top">
                <td class="px-3 py-3 font-medium text-sand-900">{{ record.year }}年</td>
                <td class="px-3 py-3 text-xs leading-6 text-sand-700">{{ formatTerritoryText(record.territories) }}</td>
                <td class="px-3 py-3">{{ record.agencyPeriod || '-' }}</td>
                <td class="px-3 py-3">{{ record.workload || '-' }}</td>
                <td class="px-3 py-3">
                  <div class="flex flex-wrap gap-2">
                    <UButton size="xs" color="neutral" variant="soft" @click="editAgencyRecord(record)">编辑</UButton>
                    <UButton size="xs" color="error" variant="soft" @click="removeAgencyRecord(record.id)">删除</UButton>
                  </div>
                </td>
              </tr>
              <tr v-if="!form.agencyRecords.length">
                <td colspan="5" class="px-3 py-8 text-center text-sand-500">还没有保存年度代理记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <template #footer>
      <UButton color="neutral" variant="soft" :disabled="busy" @click="emit('close')">取消</UButton>
      <UButton :disabled="busy" @click="submit">
        {{ promoter ? '保存修改' : '确认新增' }}
      </UButton>
    </template>
  </ModalPanel>
</template>
