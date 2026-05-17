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

const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i += 1) {
    pages.push(i)
  }
  return pages
})

function setPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === props.page) return
  emit('update:page', nextPage)
}
</script>

<template>
  <div class="mt-5 flex flex-col gap-3 border-t border-sand-200 pt-4 text-sm text-sand-600 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-center sm:text-left">
      共 {{ totalItems }} 条，每页 {{ pageSize }} 条，第 {{ page }} / {{ totalPages }} 页
    </div>
    <div class="flex items-center gap-2">
      <UButton
        class="flex-1 justify-center sm:flex-none"
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="soft"
        size="xs"
        :disabled="page <= 1"
        @click="setPage(page - 1)"
      >
        上一页
      </UButton>
      <UButton
        v-for="item in visiblePages"
        :key="item"
        class="hidden sm:inline-flex"
        size="xs"
        :color="item === page ? 'primary' : 'neutral'"
        :variant="item === page ? 'solid' : 'soft'"
        @click="setPage(item)"
      >
        {{ item }}
      </UButton>
      <UButton
        class="flex-1 justify-center sm:flex-none"
        trailing-icon="i-lucide-chevron-right"
        color="neutral"
        variant="soft"
        size="xs"
        :disabled="page >= totalPages"
        @click="setPage(page + 1)"
      >
        下一页
      </UButton>
    </div>
  </div>
</template>
