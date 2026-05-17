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
      v-model="search.schools"
      search-placeholder="搜索省份 / 学校名称"
      create-label="新增学校"
      :busy="busy"
      :selected-count="selectedIds.schools.length"
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
              <UCheckbox :model-value="areAllSelected('schools', pageRows)" @update:model-value="emit('toggle-all', $event)" />
            </th>
            <th class="px-3 py-3 font-medium">省份</th>
            <th class="px-3 py-3 font-medium">学校名称</th>
            <th class="px-3 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="school in pageRows" :key="school.id" class="border-b border-sand-100">
            <td class="px-3 py-3">
              <UCheckbox :model-value="isSelected('schools', school.id)" @update:model-value="emit('toggle-row', { id: school.id, checked: $event })" />
            </td>
            <td class="px-3 py-3">{{ school.province }}</td>
            <td class="px-3 py-3 text-sand-900">{{ school.name }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <UButton size="xs" color="neutral" variant="soft" :disabled="busy" @click="emit('edit', school)">编辑</UButton>
                <UButton size="xs" color="error" variant="soft" :disabled="busy" @click="emit('delete', school)">删除</UButton>
              </div>
            </td>
          </tr>
          <tr v-if="!pageRows.length">
            <td colspan="4" class="px-3 py-8 text-center text-sand-500">暂无学校数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar :page="page" :total-items="filteredCount" :page-size="pageSize" @update:page="emit('update:page', $event)" />
  </section>
</template>
