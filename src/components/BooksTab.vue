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
        <h2 class="text-xl font-semibold text-sand-900">书目名单</h2>
        <p class="mt-1 text-sm text-sand-600">默认每页 20 条，支持搜索和导出。</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <input v-model="search.books" class="field-input w-64" type="text" placeholder="搜索 ISBN / 书名 / 定价" />
        <button type="button" class="primary-button" :disabled="busy" @click="emit('create')">新增书目</button>
        <label class="secondary-button cursor-pointer">
          Excel 导入
          <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="emit('import', $event)" />
        </label>
        <button type="button" class="secondary-button" @click="emit('export', false)">导出筛选结果</button>
        <button type="button" class="secondary-button" :disabled="!selectedIds.books.length" @click="emit('export', true)">导出已选</button>
        <button type="button" class="danger-button" :disabled="busy || !selectedIds.books.length" @click="emit('batch-delete')">批量删除</button>
      </div>
    </div>
    <div class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-sand-200 text-sand-500">
          <tr>
            <th class="px-3 py-3 font-medium">
              <input type="checkbox" :checked="areAllSelected('books', pageRows)" @change="emit('toggle-all', $event.target.checked)" />
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
              <input type="checkbox" :checked="isSelected('books', book.id)" @change="emit('toggle-row', { id: book.id, checked: $event.target.checked })" />
            </td>
            <td class="px-3 py-3">{{ book.isbn }}</td>
            <td class="px-3 py-3 text-sand-900">{{ book.title }}</td>
            <td class="px-3 py-3">￥{{ Number(book.price || 0).toFixed(2) }}</td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" class="secondary-button !px-3 !py-2 !text-xs" :disabled="busy" @click="emit('edit', book)">编辑</button>
                <button type="button" class="danger-button" :disabled="busy" @click="emit('delete', book)">删除</button>
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
