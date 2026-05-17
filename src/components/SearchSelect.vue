<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { filterOptions, getOptionsPanelState } from '../utils/optionFiltering'

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
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const rootRef = ref(null)
const dropdownOpen = ref(false)
const query = ref('')
const activeIndex = ref(-1)
const listboxId = `search-select-${Math.random().toString(36).slice(2)}`

const selectedOption = computed(() =>
  props.options.find((option) => option.id === props.modelValue),
)

const filteredOptions = computed(() =>
  filterOptions(props.options, query.value, { emptyLimit: 8, limit: 12 }),
)
const panelState = computed(() =>
  getOptionsPanelState({
    loading: props.loading,
    options: props.options,
    filteredOptions: filteredOptions.value,
    emptyText: props.emptyText,
  }),
)

watch(
  selectedOption,
  (value) => {
    if (!dropdownOpen.value) {
      query.value = value?.label || ''
    }
  },
  { immediate: true },
)

watch(filteredOptions, () => {
  activeIndex.value = filteredOptions.value.length ? 0 : -1
})

function handleDocumentClick(event) {
  if (!rootRef.value?.contains(event.target)) {
    dropdownOpen.value = false
    query.value = selectedOption.value?.label || ''
    activeIndex.value = -1
  }
}

function selectOption(option) {
  if (!option) return
  emit('update:modelValue', option.id)
  query.value = option.label
  dropdownOpen.value = false
  activeIndex.value = -1
}

function clearValue() {
  emit('update:modelValue', '')
  query.value = ''
  dropdownOpen.value = true
  activeIndex.value = filteredOptions.value.length ? 0 : -1
}

function closeDropdown() {
  dropdownOpen.value = false
  query.value = selectedOption.value?.label || ''
  activeIndex.value = -1
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeDropdown()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    dropdownOpen.value = true
    if (!filteredOptions.value.length) return
    activeIndex.value =
      activeIndex.value < filteredOptions.value.length - 1 ? activeIndex.value + 1 : 0
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    dropdownOpen.value = true
    if (!filteredOptions.value.length) return
    activeIndex.value =
      activeIndex.value > 0 ? activeIndex.value - 1 : filteredOptions.value.length - 1
    return
  }

  if (event.key === 'Enter' && dropdownOpen.value) {
    event.preventDefault()
    selectOption(filteredOptions.value[activeIndex.value])
  }
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
        :aria-expanded="dropdownOpen ? 'true' : 'false'"
        :aria-controls="listboxId"
        role="combobox"
        @focus="dropdownOpen = true"
        @keydown="handleKeydown"
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
      </div>
    </div>

    <div
      v-if="dropdownOpen"
      :id="listboxId"
      class="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-sand-200 bg-white p-2 shadow-xl"
      :class="{ 'border-red-300 bg-red-50/30': invalid }"
      role="listbox"
    >
      <button
        v-for="(option, index) in panelState.kind === 'ready' ? filteredOptions : []"
        :key="option.id"
        type="button"
        class="flex w-full flex-col rounded-xl px-3 py-3 text-left transition hover:bg-sand-50"
        :class="{ 'bg-sand-50': index === activeIndex }"
        role="option"
        :aria-selected="modelValue === option.id"
        @mousedown.prevent="selectOption(option)"
      >
        <span class="text-sm font-medium text-sand-900">{{ option.label }}</span>
        <span v-if="option.meta" class="mt-1 text-xs text-sand-500">{{ option.meta }}</span>
      </button>

      <div v-if="panelState.kind !== 'ready'" class="px-3 py-4 text-sm text-sand-500">
        {{ panelState.text }}
      </div>
    </div>
  </div>
</template>
