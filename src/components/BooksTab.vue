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
  'update:page-size',
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
  <section class="mt-6 panel p-4 sm:p-6">
    <EntityListToolbar
      v-model="search.books"
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
    <div class="mt-5 grid gap-3 sm:hidden">
      <article
        v-for="book in pageRows"
        :key="book.id"
        class="rounded-lg border border-sand-200 bg-white p-4"
      >
        <div class="flex items-start gap-3">
          <UCheckbox :model-value="isSelected('books', book.id)" @update:model-value="emit('toggle-row', { id: book.id, checked: $event })" />
          <div class="min-w-0 flex-1">
            <p class="break-words text-base font-semibold text-sand-900">{{ book.title }}</p>
            <p class="mt-1 break-all text-sm text-sand-600">{{ book.isbn }}</p>
          </div>
        </div>
        <dl class="mt-4 grid gap-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-sand-500">定价</dt>
            <dd class="font-medium text-sand-900">￥{{ Number(book.price || 0).toFixed(2) }}</dd>
          </div>
        </dl>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <UButton size="sm" color="neutral" variant="soft" class="justify-center" :disabled="busy" @click="emit('edit', book)">编辑</UButton>
          <UButton size="sm" color="error" variant="soft" class="justify-center" :disabled="busy" @click="emit('delete', book)">删除</UButton>
        </div>
      </article>
      <div v-if="!pageRows.length" class="rounded-lg border border-dashed border-sand-200 py-8 text-center text-sm text-sand-500">
        暂无书目数据
      </div>
    </div>
    <div class="mt-5 hidden overflow-x-auto sm:block">
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
    <PaginationBar :page="page" :total-items="filteredCount" :page-size="pageSize" @update:page="emit('update:page', $event)" @update:page-size="emit('update:page-size', $event)" />
  </section>
</template>
