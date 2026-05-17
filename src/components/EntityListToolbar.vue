<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  modelValue: {
    type: String,
    default: '',
  },
  searchPlaceholder: {
    type: String,
    required: true,
  },
  searchWidthClass: {
    type: String,
    default: 'w-64',
  },
  createLabel: {
    type: String,
    required: true,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
  importEnabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'create',
  'import',
  'export',
  'batch-delete',
])
</script>

<template>
  <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div>
      <h2 class="text-xl font-semibold text-sand-900">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm text-sand-600">{{ description }}</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <input
        :value="modelValue"
        class="field-input"
        :class="searchWidthClass"
        type="text"
        :placeholder="searchPlaceholder"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <button type="button" class="primary-button" :disabled="busy" @click="emit('create')">{{ createLabel }}</button>
      <label v-if="importEnabled" class="secondary-button cursor-pointer">
        Excel 导入
        <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="emit('import', $event)" />
      </label>
      <button type="button" class="secondary-button" @click="emit('export', false)">导出筛选结果</button>
      <button type="button" class="secondary-button" :disabled="!selectedCount" @click="emit('export', true)">导出已选</button>
      <button type="button" class="danger-button" :disabled="busy || !selectedCount" @click="emit('batch-delete')">批量删除</button>
    </div>
  </div>
</template>
