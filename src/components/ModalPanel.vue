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
      content: ['mx-3 w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg sm:mx-0 sm:w-full', maxWidthClass],
      title: 'text-xl font-semibold text-sand-900',
      body: 'max-h-[calc(100dvh-12rem)] overflow-auto px-4 py-4 sm:px-6 sm:py-5',
      footer: 'flex flex-col gap-3 border-t border-sand-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5 [&>*]:w-full sm:[&>*]:w-auto',
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
