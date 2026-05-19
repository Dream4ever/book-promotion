<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
})

const emit = defineEmits(['update:page', 'update:page-size'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))

const pageSizeItems = [20, 50, 100]


function setPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === props.page) return
  emit('update:page', nextPage)
}
</script>

<template>
  <div class="mt-5 flex flex-col gap-3 border-t border-sand-200 pt-4 text-sm text-sand-600 lg:flex-row lg:items-center lg:justify-between">
    <div class="text-center sm:text-left">
      共 {{ totalItems }} 条，每页 {{ pageSize }} 条，第 {{ page }} / {{ totalPages }} 页
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <USelect
        :model-value="pageSize"
        :items="pageSizeItems"
        class="w-full sm:w-28"
        @update:model-value="emit('update:page-size', Number($event))"
      />
      <UPagination
        :page="page"
        :total="totalItems"
        :items-per-page="pageSize"
        :sibling-count="1"
        show-edges
        @update:page="setPage"
      />
    </div>
  </div>
</template>
