<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  maxWidthClass: {
    type: String,
    default: 'max-w-3xl',
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-sand-900/40 p-4">
    <div class="panel max-h-[88vh] w-full overflow-hidden" :class="maxWidthClass">
      <div class="flex items-start justify-between border-b border-sand-200 px-6 py-5">
        <div>
          <h3 class="text-xl font-semibold text-sand-900">{{ title }}</h3>
          <slot name="description" />
        </div>
        <button type="button" class="text-sm text-sand-500 hover:text-sand-800" @click="emit('close')">
          关闭
        </button>
      </div>
      <div class="max-h-[68vh] overflow-auto px-6 py-5">
        <slot />
      </div>
      <div v-if="$slots.footer" class="flex flex-wrap justify-end gap-3 border-t border-sand-200 px-6 py-5">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
