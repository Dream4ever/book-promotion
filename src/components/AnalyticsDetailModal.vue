<script setup>
import ModalPanel from './ModalPanel.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  rows: {
    type: Array,
    default: () => [],
  },
  formatTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['close', 'export'])
</script>

<template>
  <ModalPanel :visible="visible" :title="title || '统计明细'" max-width-class="max-w-6xl" @close="emit('close')">
    <template #description>
      <p class="mt-2 text-sm text-sand-600">共 {{ rows.length }} 条报备记录，保留历史学期数据可直接查询。</p>
    </template>
    <div class="grid gap-3 sm:hidden">
      <article
        v-for="row in rows"
        :key="row.id"
        class="rounded-lg border border-sand-200 bg-white p-4"
      >
        <p class="font-semibold text-sand-900">{{ row.term }}</p>
        <p class="mt-1 break-words text-sm text-sand-600">{{ row.schoolLabel }}</p>
        <dl class="mt-4 grid gap-3 text-sm">
          <div class="grid gap-1">
            <dt class="text-sand-500">书目</dt>
            <dd class="break-words text-sand-900">{{ row.bookLabel }}</dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sand-500">推广商</dt>
            <dd class="break-words text-sand-900">{{ row.promoterLabel }}</dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sand-500">备注</dt>
            <dd class="break-words text-sand-700">{{ row.note || '-' }}</dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sand-500">报备时间</dt>
            <dd class="text-sand-900">{{ formatTime(row.updatedAt || row.createdAt) }}</dd>
          </div>
        </dl>
      </article>
      <div v-if="!rows.length" class="rounded-lg border border-dashed border-sand-200 py-8 text-center text-sm text-sand-500">
        暂无明细数据
      </div>
    </div>
    <div class="hidden overflow-x-auto sm:block">
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
          <tr v-for="row in rows" :key="row.id" class="border-b border-sand-100 align-top">
            <td class="px-3 py-3">{{ row.term }}</td>
            <td class="px-3 py-3">{{ row.schoolLabel }}</td>
            <td class="px-3 py-3">{{ row.bookLabel }}</td>
            <td class="px-3 py-3">{{ row.promoterLabel }}</td>
            <td class="px-3 py-3 text-sand-700">{{ row.note || '-' }}</td>
            <td class="px-3 py-3">{{ formatTime(row.updatedAt || row.createdAt) }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="6" class="px-3 py-8 text-center text-sand-500">暂无明细数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <template #footer>
      <UButton color="neutral" variant="soft" @click="emit('close')">关闭</UButton>
      <UButton icon="i-lucide-download" @click="emit('export')">导出明细</UButton>
    </template>
  </ModalPanel>
</template>
