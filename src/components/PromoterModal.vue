<script setup>
import { reactive, watch } from 'vue'
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
      <div v-if="localError.text" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ localError.text }}
      </div>
      <div>
        <label class="label-text">推广商名称</label>
        <input v-model="form.name" class="field-input" type="text" placeholder="例如：华东教育推广中心" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label-text">联系人</label>
          <input v-model="form.contact" class="field-input" type="text" placeholder="联系人姓名" />
        </div>
        <div>
          <label class="label-text">联系电话</label>
          <input v-model="form.phone" class="field-input" type="text" placeholder="手机号或座机" />
        </div>
      </div>
      <div class="grid gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h4 class="text-base font-semibold text-sand-900">年度代理记录</h4>
            <p class="mt-1 text-sm text-sand-600">先编辑某一年度的代理信息，再加入下方历史记录列表。</p>
          </div>
          <span class="tag">{{ form.agencyRecords.length }} 条历史记录</span>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <div>
            <label class="label-text">代理年度</label>
            <input v-model="form.agencyRecordYear" class="field-input" type="number" min="2000" max="2100" placeholder="例如：2026" />
          </div>
          <div>
            <label class="label-text">代理期间</label>
            <input v-model="form.agencyPeriod" class="field-input" type="text" placeholder="例如：2026.01-2026.12" />
          </div>
          <div>
            <label class="label-text">任务量</label>
            <input v-model="form.workload" class="field-input" type="text" placeholder="例如：年度目标 50 校" />
          </div>
        </div>
        <div class="rounded-2xl border border-sand-200 bg-white p-4">
          <div class="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label class="label-text">代理省份</label>
              <select v-model="form.province" class="field-input">
                <option value="">请选择省份</option>
                <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
              </select>
            </div>
            <div>
              <label class="label-text">是否接单</label>
              <select v-model="form.accepting" class="field-input">
                <option :value="true">接单</option>
                <option :value="false">不接单</option>
              </select>
            </div>
            <button type="button" class="secondary-button" @click="addTerritory">添加省份</button>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <div
              v-for="territory in form.territories"
              :key="territory.province"
              class="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-2 text-sm text-sand-800"
            >
              <span>{{ territory.province }} / {{ territory.accepting ? '接单' : '不接单' }}</span>
              <button type="button" class="text-sand-400 transition hover:text-red-600" @click="removeTerritory(territory.province)">删除</button>
            </div>
            <div v-if="!form.territories.length" class="text-sm text-sand-500">当前年度还没有配置代理省份</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="secondary-button" @click="saveAgencyRecord">
            {{ form.agencyRecordId ? '保存年度记录' : '加入年度记录' }}
          </button>
          <button type="button" class="secondary-button" @click="resetAgencyDraft">清空当前年度</button>
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
              <tr v-for="record in form.agencyRecords" :key="record.id" class="border-b border-sand-100 align-top">
                <td class="px-3 py-3 font-medium text-sand-900">{{ record.year }}年</td>
                <td class="px-3 py-3 text-xs leading-6 text-sand-700">{{ formatTerritoryText(record.territories) }}</td>
                <td class="px-3 py-3">{{ record.agencyPeriod || '-' }}</td>
                <td class="px-3 py-3">{{ record.workload || '-' }}</td>
                <td class="px-3 py-3">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="secondary-button !px-3 !py-2 !text-xs" @click="editAgencyRecord(record)">编辑</button>
                    <button type="button" class="danger-button" @click="removeAgencyRecord(record.id)">删除</button>
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
      <button type="button" class="secondary-button" :disabled="busy" @click="emit('close')">取消</button>
      <button type="button" class="primary-button" :disabled="busy" @click="submit">
        {{ promoter ? '保存修改' : '确认新增' }}
      </button>
    </template>
  </ModalPanel>
</template>
