<script setup>
import { computed, reactive, watch } from 'vue'
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
  school: {
    type: Object,
    default: null,
  },
  provinces: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({ province: '', name: '' })

const provinceOptions = computed(() => [
  { label: '请选择省份', value: '' },
  ...props.provinces.map((province) => ({ label: province, value: province })),
])

function resetForm() {
  form.province = props.school?.province || ''
  form.name = props.school?.name || ''
}

watch(
  () => [props.visible, props.school],
  () => {
    if (props.visible) resetForm()
  },
  { immediate: true },
)

function submit() {
  emit('submit', {
    province: form.province,
    name: form.name,
  })
}
</script>

<template>
  <ModalPanel :visible="visible" :title="school ? '修改学校' : '新增学校'" @close="emit('close')">
    <div class="grid gap-4">
      <div>
        <label class="label-text">省份</label>
        <USelect v-model="form.province" class="w-full" :items="provinceOptions" />
      </div>
      <div>
        <label class="label-text">学校名称</label>
        <UInput v-model="form.name" class="w-full" type="text" placeholder="例如：杭州第一中学" />
      </div>
    </div>
    <template #footer>
      <UButton color="neutral" variant="soft" :disabled="busy" @click="emit('close')">取消</UButton>
      <UButton :disabled="busy" @click="submit">
        {{ school ? '保存修改' : '确认新增' }}
      </UButton>
    </template>
  </ModalPanel>
</template>
