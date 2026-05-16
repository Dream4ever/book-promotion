<script setup>
import { computed } from 'vue'
import MultiSearchSelect from './MultiSearchSelect.vue'

const props = defineProps({
  bookMode: {
    type: String,
    required: true,
  },
  bookIds: {
    type: Array,
    default: () => [],
  },
  modes: {
    type: Array,
    default: () => [],
  },
  bookOptions: {
    type: Array,
    default: () => [],
  },
  bookIdError: {
    type: String,
    default: '',
  },
  bookIdsError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-mode', 'update:bookIds'])

const activeMode = computed(() => props.modes.find((mode) => mode.key === props.bookMode))
</script>

<template>
  <div>
    <label class="label-text">书目</label>
    <div
      class="grid gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-4"
      :class="{ 'border-red-300 bg-red-50/40': bookIdError || bookIdsError }"
    >
      <div class="flex flex-col gap-2 sm:flex-row" role="tablist" aria-label="书目选择方式">
        <button
          v-for="mode in modes"
          :key="mode.key"
          type="button"
          class="flex-1 rounded-xl border px-3 py-3 text-left text-sm font-medium transition"
          :class="bookMode === mode.key
            ? 'border-pine-600 bg-pine-600 text-white shadow-sm'
            : 'border-sand-200 bg-white text-sand-700 hover:border-sand-300 hover:bg-sand-100'"
          role="tab"
          :aria-selected="bookMode === mode.key"
          @click="emit('select-mode', mode.key)"
        >
          {{ mode.label }}
        </button>
      </div>

      <div class="rounded-xl bg-white px-3 py-3">
        <p class="text-xs leading-5 text-sand-500">
          {{ activeMode?.description }}
        </p>
        <div v-if="bookMode === 'single'" class="mt-3">
          <MultiSearchSelect
            :model-value="bookIds"
            :options="bookOptions"
            placeholder="输入 ISBN 或书名"
            empty-text="未匹配到书目"
            :invalid="Boolean(bookIdError)"
            @update:model-value="emit('update:bookIds', $event)"
          />
          <p v-if="bookIdError" class="field-error-text">{{ bookIdError }}</p>
        </div>
        <div v-else-if="bookMode === 'exclude'" class="mt-3">
          <MultiSearchSelect
            :model-value="bookIds"
            :options="bookOptions"
            placeholder="搜索要排除的 ISBN 或书名"
            empty-text="未匹配到书目"
            :invalid="Boolean(bookIdsError)"
            @update:model-value="emit('update:bookIds', $event)"
          />
          <p v-if="bookIdsError" class="field-error-text">{{ bookIdsError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
