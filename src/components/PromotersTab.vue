<script setup>
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
})

const emit = defineEmits([
  'update:page',
  'create',
  'edit',
  'delete',
  'import',
  'export',
  'batch-delete',
  'toggle-row',
  'toggle-all',
])
</script>

<template>
  <section class="mt-6 panel p-6">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-sand-900">推广商名单</h2>
        <p class="mt-1 text-sm text-sand-600">可按名称、联系人、电话、代理省份搜索。</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <input v-model="search.promoters" class="field-input w-72" type="text" placeholder="搜索推广商 / 联系人 / 电话 / 省份" />
        <button type="button" class="primary-button" :disabled="busy" @click="emit('create')">新增推广商</button>
        <label class="secondary-button cursor-pointer">
          Excel 导入
          <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="emit('import', $event)" />
        </label>
        <button type="button" class="secondary-button" @click="emit('export', false)">导出筛选结果</button>
        <button type="button" class="secondary-button" :disabled="!selectedIds.promoters.length" @click="emit('export', true)">导出已选</button>
        <button type="button" class="danger-button" :disabled="busy || !selectedIds.promoters.length" @click="emit('batch-delete')">批量删除</button>
      </div>
    </div>
    <div class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-sand-200 text-sand-500">
          <tr>
            <th class="px-3 py-3 font-medium">
              <input type="checkbox" :checked="areAllSelected('promoters', pageRows)" @change="emit('toggle-all', $event.target.checked)" />
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
          <tr v-for="promoter in pageRows" :key="promoter.id" class="border-b border-sand-100 align-top">
            <td class="px-3 py-3">
              <input type="checkbox" :checked="isSelected('promoters', promoter.id)" @change="emit('toggle-row', { id: promoter.id, checked: $event.target.checked })" />
            </td>
            <td class="px-3 py-3 font-medium text-sand-900">{{ promoter.name }}</td>
            <td class="px-3 py-3">{{ promoter.contact || '-' }}</td>
            <td class="px-3 py-3">{{ promoter.phone || '-' }}</td>
            <td class="px-3 py-3">{{ promoter.latestAgencyYear }}</td>
            <td class="px-3 py-3 text-xs leading-6 text-sand-700">
              {{ promoter.latestAgencyText }}
            </td>
            <td class="px-3 py-3">{{ promoter.agencyRecordCount }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="emit('edit', promoter)">编辑</button>
                <button type="button" class="danger-button" :disabled="busy" @click="emit('delete', promoter)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!pageRows.length">
            <td colspan="8" class="px-3 py-8 text-center text-sand-500">暂无推广商数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar :page="page" :total-items="filteredCount" :page-size="pageSize" @update:page="emit('update:page', $event)" />
  </section>
</template>
