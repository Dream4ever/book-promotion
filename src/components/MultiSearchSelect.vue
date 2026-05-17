<script setup>
import { computed, ref } from 'vue'
import { filterOptions, getOptionsPanelState } from '../utils/optionFiltering'

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
  loading: {
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

const filteredOptions = computed(() => filterOptions(props.options, query.value, { limit: 20 }))
const panelState = computed(() =>
  getOptionsPanelState({
    loading: props.loading,
    options: props.options,
    filteredOptions: filteredOptions.value,
    emptyText: props.emptyText,
  }),
)

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

function toggleFirstMatch() {
  if (!filteredOptions.value.length) return
  toggleOption(filteredOptions.value[0])
}
</script>

<template>
  <div class="grid gap-3">
    <UInput
      v-model="query"
      type="text"
      :color="invalid ? 'error' : 'neutral'"
      :highlight="invalid"
      :placeholder="placeholder"
      :aria-invalid="invalid ? 'true' : 'false'"
      @keydown.enter.prevent="toggleFirstMatch"
    />

    <div
      class="max-h-[45vh] overflow-auto rounded-lg border border-sand-200 bg-white p-2"
      :class="{ 'border-red-300 bg-red-50/30': invalid }"
      role="listbox"
      aria-multiselectable="true"
    >
      <button
        v-for="option in panelState.kind === 'ready' ? filteredOptions : []"
        :key="option.id"
        type="button"
        class="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-sand-50"
        role="option"
        :aria-selected="selectedIds.has(option.id)"
        @click="toggleOption(option)"
      >
        <UCheckbox class="mt-0.5" :model-value="selectedIds.has(option.id)" readonly />
        <span class="flex flex-col">
          <span class="text-sm font-medium text-sand-900">{{ option.label }}</span>
          <span v-if="option.meta" class="mt-1 text-xs text-sand-500">{{ option.meta }}</span>
        </span>
      </button>

      <div v-if="panelState.kind !== 'ready'" class="px-3 py-4 text-sm text-sand-500">
        {{ panelState.text }}
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <UBadge
        v-for="option in selectedOptions"
        :key="option.id"
        color="neutral"
        variant="soft"
        class="max-w-full gap-2 px-3 py-2"
      >
        <span class="min-w-0 truncate">{{ option.label }}</span>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" square @click="removeOption(option.id)" />
      </UBadge>
      <span v-if="!selectedOptions.length" class="text-sm text-sand-500">尚未选择书目</span>
    </div>
  </div>
</template>
