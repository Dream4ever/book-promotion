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
    <div class="flex flex-wrap gap-3">
      <UInput
        :model-value="modelValue"
        icon="i-lucide-search"
        class="min-w-0"
        :class="searchWidthClass"
        :placeholder="searchPlaceholder"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <UButton icon="i-lucide-plus" :disabled="busy" @click="emit('create')">
        {{ createLabel }}
      </UButton>
      <UButton v-if="importEnabled" as="label" icon="i-lucide-upload" color="neutral" variant="soft" class="cursor-pointer">
        Excel 导入
        <input class="hidden" type="file" accept=".xlsx,.xls,.csv" @change="emit('import', $event)" />
      </UButton>
      <UButton icon="i-lucide-download" color="neutral" variant="soft" @click="emit('export', false)">导出筛选结果</UButton>
      <UButton icon="i-lucide-check-check" color="neutral" variant="soft" :disabled="!selectedCount" @click="emit('export', true)">导出已选</UButton>
      <UButton icon="i-lucide-trash-2" color="error" variant="soft" :disabled="busy || !selectedCount" @click="emit('batch-delete')">批量删除</UButton>
    </div>
  </div>
</template>
