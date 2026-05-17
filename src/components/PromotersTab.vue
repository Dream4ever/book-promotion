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
    <EntityListToolbar
      v-model="search.promoters"
      search-placeholder="搜索推广商 / 联系人 / 电话 / 省份"
      search-width-class="w-72"
      create-label="新增推广商"
      :busy="busy"
      :selected-count="selectedIds.promoters.length"
      import-enabled
      @create="emit('create')"
      @import="emit('import', $event)"
      @export="emit('export', $event)"
      @batch-delete="emit('batch-delete')"
    />
    <div class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-sand-200 text-sand-500">
          <tr>
            <th class="px-3 py-3 font-medium">
              <UCheckbox :model-value="areAllSelected('promoters', pageRows)" @update:model-value="emit('toggle-all', $event)" />
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
              <UCheckbox :model-value="isSelected('promoters', promoter.id)" @update:model-value="emit('toggle-row', { id: promoter.id, checked: $event })" />
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
                <UButton size="xs" color="neutral" variant="soft" :disabled="busy" @click="emit('edit', promoter)">编辑</UButton>
                <UButton size="xs" color="error" variant="soft" :disabled="busy" @click="emit('delete', promoter)">删除</UButton>
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
