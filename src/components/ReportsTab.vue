<script setup>
import EntityListToolbar from './EntityListToolbar.vue'
import PaginationBar from './PaginationBar.vue'

defineProps({
  busy: {
    type: Boolean,
    required: true,
  },
  search: {
    type: Object,
    required: true,
  },
  selectedIds: {
    type: Object,
    required: true,
  },
  pageRows: {
    type: Array,
    required: true,
  },
  filteredCount: {
    type: Number,
    required: true,
  },
  page: {
    type: Number,
    required: true,
  },
  pageSize: {
    type: Number,
    required: true,
  },
  isSelected: {
    type: Function,
    required: true,
  },
  areAllSelected: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'update:page',
  'create',
  'edit',
  'delete',
  'export',
  'batch-delete',
  'toggle-row',
  'toggle-all',
])
</script>

<template>
  <section class="mt-6 panel p-4 sm:p-6">
    <EntityListToolbar
      v-model="search.reports"
      search-placeholder="搜索学期 / 省份 / 学校 / 书目 / 推广商"
      search-width-class="sm:w-72"
      create-label="新增报备"
      :busy="busy"
      :selected-count="selectedIds.reports.length"
      @create="emit('create')"
      @export="emit('export', $event)"
      @batch-delete="emit('batch-delete')"
    />
    <div class="mt-5 grid gap-3 sm:hidden">
      <article
        v-for="report in pageRows"
        :key="report.id"
        class="rounded-lg border border-sand-200 bg-white p-4"
      >
        <div class="flex items-start gap-3">
          <UCheckbox :model-value="isSelected('reports', report.id)" @update:model-value="emit('toggle-row', { id: report.id, checked: $event })" />
          <div class="min-w-0 flex-1">
            <p class="text-base font-semibold text-sand-900">{{ report.term }}</p>
            <p class="mt-1 break-words text-sm text-sand-600">{{ report.schoolLabel }}</p>
          </div>
        </div>
        <dl class="mt-4 grid gap-3 text-sm">
          <div class="grid gap-1">
            <dt class="text-sand-500">书目</dt>
            <dd class="break-words text-sand-900">{{ report.bookLabel }}</dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sand-500">推广商</dt>
            <dd class="break-words text-sand-900">{{ report.promoterLabel }}</dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sand-500">备注</dt>
            <dd class="break-words text-sand-700">{{ report.note || '-' }}</dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sand-500">报备时间</dt>
            <dd class="text-sand-900">{{ formatTime(report.updatedAt || report.createdAt) }}</dd>
          </div>
        </dl>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <UButton size="sm" color="neutral" variant="soft" class="justify-center" :disabled="busy" @click="emit('edit', report)">编辑</UButton>
          <UButton size="sm" color="error" variant="soft" class="justify-center" :disabled="busy" @click="emit('delete', report)">删除</UButton>
        </div>
      </article>
      <div v-if="!pageRows.length" class="rounded-lg border border-dashed border-sand-200 py-8 text-center text-sm text-sand-500">
        暂无报备记录
      </div>
    </div>
    <div class="mt-5 hidden overflow-x-auto sm:block">
      <table class="min-w-[1120px] text-left text-sm">
        <thead class="border-b border-sand-200 text-sand-500">
          <tr>
            <th class="px-3 py-3 font-medium">
              <UCheckbox :model-value="areAllSelected('reports', pageRows)" @update:model-value="emit('toggle-all', $event)" />
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
          <tr v-for="report in pageRows" :key="report.id" class="border-b border-sand-100 align-top">
            <td class="px-3 py-3">
              <UCheckbox :model-value="isSelected('reports', report.id)" @update:model-value="emit('toggle-row', { id: report.id, checked: $event })" />
            </td>
            <td class="px-3 py-3">{{ report.term }}</td>
            <td class="px-3 py-3">{{ report.schoolLabel }}</td>
            <td class="px-3 py-3">{{ report.bookLabel }}</td>
            <td class="px-3 py-3">{{ report.promoterLabel }}</td>
            <td class="px-3 py-3 text-sand-700">{{ report.note || '-' }}</td>
            <td class="px-3 py-3">{{ formatTime(report.updatedAt || report.createdAt) }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <UButton size="xs" color="neutral" variant="soft" :disabled="busy" @click="emit('edit', report)">编辑</UButton>
                <UButton size="xs" color="error" variant="soft" :disabled="busy" @click="emit('delete', report)">删除</UButton>
              </div>
            </td>
          </tr>
          <tr v-if="!pageRows.length">
            <td colspan="8" class="px-3 py-8 text-center text-sand-500">暂无报备记录</td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar :page="page" :total-items="filteredCount" :page-size="pageSize" @update:page="emit('update:page', $event)" />
  </section>
</template>
