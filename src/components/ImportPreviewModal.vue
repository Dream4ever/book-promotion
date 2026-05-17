<script setup>
import ModalPanel from './ModalPanel.vue'
import { formatAgencyRecordsText } from '../utils/promoterAgencyRecords'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  preview: {
    type: Object,
    required: true,
  },
  kindLabels: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'confirm'])

function formatPreviewValue(kind, row, key) {
  if (kind === 'books' && key === 'price') {
    return `￥${Number(row.price || 0).toFixed(2)}`
  }
  if (kind === 'promoters' && key === 'agencyRecords') {
    return formatAgencyRecordsText(row.agencyRecords)
  }
  return row[key] || '-'
}
</script>

<template>
  <ModalPanel :visible="visible" title="导入预览确认" max-width-class="max-w-6xl" @close="emit('close')">
    <template #description>
      <p class="mt-2 text-sm text-sand-600">
        文件：{{ preview.fileName }}，原始行数 {{ preview.rawCount }}，可导入 {{ preview.rows.length }} 条{{ kindLabels[preview.kind] }}数据。
      </p>
    </template>
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-sand-200 text-sand-500">
        <tr>
          <th class="px-3 py-3 font-medium">#</th>
          <th v-for="column in preview.columns" :key="column.key" class="px-3 py-3 font-medium">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in preview.rows" :key="index" class="border-b border-sand-100 align-top">
          <td class="px-3 py-3">{{ index + 1 }}</td>
          <td v-for="column in preview.columns" :key="column.key" class="px-3 py-3">
            {{ formatPreviewValue(preview.kind, row, column.key) }}
          </td>
        </tr>
      </tbody>
    </table>
    <template #footer>
      <UButton color="neutral" variant="soft" :disabled="busy" @click="emit('close')">取消</UButton>
      <UButton icon="i-lucide-upload" :disabled="busy" @click="emit('confirm')">确认导入</UButton>
    </template>
  </ModalPanel>
</template>
