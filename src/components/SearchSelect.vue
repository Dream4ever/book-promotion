<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
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

const rootRef = ref(null)
const dropdownOpen = ref(false)
const query = ref('')

const selectedOption = computed(() =>
  props.options.find((option) => option.id === props.modelValue),
)

const filteredOptions = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return props.options.slice(0, 8)
  return props.options
    .filter((option) => option.keywords.toLowerCase().includes(keyword))
    .slice(0, 12)
})

watch(
  selectedOption,
  (value) => {
    if (!dropdownOpen.value) {
      query.value = value?.label || ''
    }
  },
  { immediate: true },
)

function handleDocumentClick(event) {
  if (!rootRef.value?.contains(event.target)) {
    dropdownOpen.value = false
    query.value = selectedOption.value?.label || ''
  }
}

function selectOption(option) {
  emit('update:modelValue', option.id)
  query.value = option.label
  dropdownOpen.value = false
}

function clearValue() {
  emit('update:modelValue', '')
  query.value = ''
  dropdownOpen.value = true
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <div class="relative">
      <input
        v-model="query"
        type="text"
        class="field-input pr-20"
        :class="{ 'field-input-error': invalid }"
        :placeholder="placeholder"
        :aria-invalid="invalid ? 'true' : 'false'"
        @focus="dropdownOpen = true"
      />
      <div class="absolute inset-y-0 right-3 flex items-center gap-2">
        <button
          v-if="modelValue"
          type="button"
          class="text-xs text-sand-500 transition hover:text-sand-800"
          @click="clearValue"
        >
          清空
        </button>
        <span class="text-xs text-sand-400">模糊查询</span>
      </div>
    </div>

    <div
      v-if="dropdownOpen"
      class="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-sand-200 bg-white p-2 shadow-xl"
    >
      <button
        v-for="option in filteredOptions"
        :key="option.id"
        type="button"
        class="flex w-full flex-col rounded-xl px-3 py-3 text-left transition hover:bg-sand-50"
        @mousedown.prevent="selectOption(option)"
      >
        <span class="text-sm font-medium text-sand-900">{{ option.label }}</span>
        <span v-if="option.meta" class="mt-1 text-xs text-sand-500">{{ option.meta }}</span>
      </button>

      <div v-if="!filteredOptions.length" class="px-3 py-4 text-sm text-sand-500">
        {{ emptyText }}
      </div>
    </div>
  </div>
</template>
