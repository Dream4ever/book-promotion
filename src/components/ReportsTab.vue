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
  <section class="mt-6 panel p-6">
    <EntityListToolbar
      v-model="search.reports"
      title="报备记录"
      description="报备时支持模糊查询，修改时仍校验唯一性。"
      search-placeholder="搜索学期 / 省份 / 学校 / 书目 / 推广商"
      search-width-class="w-72"
      create-label="新增报备"
      :busy="busy"
      :selected-count="selectedIds.reports.length"
      @create="emit('create')"
      @export="emit('export', $event)"
      @batch-delete="emit('batch-delete')"
    />
    <div class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-sand-200 text-sand-500">
          <tr>
            <th class="px-3 py-3 font-medium">
              <input type="checkbox" :checked="areAllSelected('reports', pageRows)" @change="emit('toggle-all', $event.target.checked)" />
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
              <input type="checkbox" :checked="isSelected('reports', report.id)" @change="emit('toggle-row', { id: report.id, checked: $event.target.checked })" />
            </td>
            <td class="px-3 py-3">{{ report.term }}</td>
            <td class="px-3 py-3">{{ report.schoolLabel }}</td>
            <td class="px-3 py-3">{{ report.bookLabel }}</td>
            <td class="px-3 py-3">{{ report.promoterLabel }}</td>
            <td class="px-3 py-3 text-sand-700">{{ report.note || '-' }}</td>
            <td class="px-3 py-3">{{ formatTime(report.updatedAt || report.createdAt) }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="emit('edit', report)">编辑</button>
                <button type="button" class="danger-button" :disabled="busy" @click="emit('delete', report)">删除</button>
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
