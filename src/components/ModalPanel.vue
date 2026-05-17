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

function handleOpenChange(open) {
  if (!open) {
    emit('close')
  }
}
</script>

<template>
  <UModal
    :open="visible"
    :title="title"
    scrollable
    :ui="{
      content: ['w-full overflow-hidden', maxWidthClass],
      title: 'text-xl font-semibold text-sand-900',
      body: 'max-h-[68vh] overflow-auto px-6 py-5',
      footer: 'flex flex-wrap justify-end gap-3 border-t border-sand-200 px-6 py-5',
    }"
    @update:open="handleOpenChange"
  >
    <template #description>
      <slot name="description" />
    </template>

    <template #body>
      <slot />
    </template>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UModal>
</template>
