<script setup>
import { reactive, watch } from 'vue'
import ModalPanel from './ModalPanel.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  book: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({ isbn: '', title: '', price: '' })

function resetForm() {
  form.isbn = props.book?.isbn || ''
  form.title = props.book?.title || ''
  form.price = props.book ? String(props.book.price ?? '') : ''
}

watch(
  () => [props.visible, props.book],
  () => {
    if (props.visible) resetForm()
  },
  { immediate: true },
)

function submit() {
  emit('submit', {
    isbn: form.isbn,
    title: form.title,
    price: form.price,
  })
}
</script>

<template>
  <ModalPanel :visible="visible" :title="book ? '修改书目' : '新增书目'" @close="emit('close')">
    <div class="grid gap-4">
      <div>
        <label class="label-text">ISBN</label>
        <input v-model="form.isbn" class="field-input" type="text" placeholder="例如：9787300000000" />
      </div>
      <div>
        <label class="label-text">书名</label>
        <input v-model="form.title" class="field-input" type="text" placeholder="例如：语文同步阅读" />
      </div>
      <div>
        <label class="label-text">定价</label>
        <input v-model="form.price" class="field-input" type="number" min="0" step="0.01" placeholder="例如：39.80" />
      </div>
    </div>
    <template #footer>
      <button type="button" class="secondary-button" :disabled="busy" @click="emit('close')">取消</button>
      <button type="button" class="primary-button" :disabled="busy" @click="submit">
        {{ book ? '保存修改' : '确认新增' }}
      </button>
    </template>
  </ModalPanel>
</template>
