<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: '请输入关键词',
  },
  emptyText: {
    type: String,
    default: '没有找到可选项',
  },
  invalid: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const query = ref('')

const selectedIds = computed(() => new Set(props.modelValue))

const selectedOptions = computed(() =>
  props.modelValue
    .map((id) => props.options.find((option) => option.id === id))
    .filter(Boolean),
)

const filteredOptions = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const rows = keyword
    ? props.options.filter((option) => option.keywords.toLowerCase().includes(keyword))
    : props.options
  return rows.slice(0, 20)
})

function toggleOption(option) {
  const exists = selectedIds.value.has(option.id)
  emit(
    'update:modelValue',
    exists
      ? props.modelValue.filter((id) => id !== option.id)
      : [...props.modelValue, option.id],
  )
}

function removeOption(id) {
  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item !== id),
  )
}
</script>

<template>
  <div class="grid gap-3">
    <input
      v-model="query"
      type="text"
      class="field-input"
      :class="{ 'field-input-error': invalid }"
      :placeholder="placeholder"
      :aria-invalid="invalid ? 'true' : 'false'"
    />

    <div
      class="max-h-64 overflow-auto rounded-2xl border border-sand-200 bg-white p-2"
      :class="{ 'border-red-300 bg-red-50/30': invalid }"
    >
      <button
        v-for="option in filteredOptions"
        :key="option.id"
        type="button"
        class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-sand-50"
        @click="toggleOption(option)"
      >
        <input type="checkbox" class="mt-1" :checked="selectedIds.has(option.id)" readonly />
        <span class="flex flex-col">
          <span class="text-sm font-medium text-sand-900">{{ option.label }}</span>
          <span v-if="option.meta" class="mt-1 text-xs text-sand-500">{{ option.meta }}</span>
        </span>
      </button>

      <div v-if="!filteredOptions.length" class="px-3 py-4 text-sm text-sand-500">
        {{ emptyText }}
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <span
        v-for="option in selectedOptions"
        :key="option.id"
        class="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-2 text-sm text-sand-800"
      >
        {{ option.label }}
        <button type="button" class="text-sand-400 transition hover:text-red-600" @click="removeOption(option.id)">
          删除
        </button>
      </span>
      <span v-if="!selectedOptions.length" class="text-sm text-sand-500">尚未选择书目</span>
    </div>
  </div>
</template>
