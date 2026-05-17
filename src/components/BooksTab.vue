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
      v-model="search.books"
      title="书目名单"
      description="默认每页 20 条，支持搜索和导出。"
      search-placeholder="搜索 ISBN / 书名 / 定价"
      create-label="新增书目"
      :busy="busy"
      :selected-count="selectedIds.books.length"
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
              <UCheckbox :model-value="areAllSelected('books', pageRows)" @update:model-value="emit('toggle-all', $event)" />
            </th>
            <th class="px-3 py-3 font-medium">ISBN</th>
            <th class="px-3 py-3 font-medium">书名</th>
            <th class="px-3 py-3 font-medium">定价</th>
            <th class="px-3 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in pageRows" :key="book.id" class="border-b border-sand-100">
            <td class="px-3 py-3">
              <UCheckbox :model-value="isSelected('books', book.id)" @update:model-value="emit('toggle-row', { id: book.id, checked: $event })" />
            </td>
            <td class="px-3 py-3">{{ book.isbn }}</td>
            <td class="px-3 py-3 text-sand-900">{{ book.title }}</td>
            <td class="px-3 py-3">￥{{ Number(book.price || 0).toFixed(2) }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <UButton size="xs" color="neutral" variant="soft" :disabled="busy" @click="emit('edit', book)">编辑</UButton>
                <UButton size="xs" color="error" variant="soft" :disabled="busy" @click="emit('delete', book)">删除</UButton>
              </div>
            </td>
          </tr>
          <tr v-if="!pageRows.length">
            <td colspan="5" class="px-3 py-8 text-center text-sand-500">暂无书目数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar :page="page" :total-items="filteredCount" :page-size="pageSize" @update:page="emit('update:page', $event)" />
  </section>
</template>
