<script setup>
import { computed } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
  termOptions: {
    type: Array,
    required: true,
  },
  provinces: {
    type: Array,
    required: true,
  },
  promoters: {
    type: Array,
    required: true,
  },
  books: {
    type: Array,
    required: true,
  },
  reportRows: {
    type: Array,
    required: true,
  },
  provinceStats: {
    type: Array,
    required: true,
  },
  promoterStats: {
    type: Array,
    required: true,
  },
  bookStats: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['export', 'open-detail'])

const termItems = computed(() => [
  { label: '全部学期', value: '' },
  ...props.termOptions.map((term) => ({ label: term, value: term })),
])

const provinceItems = computed(() => [
  { label: '全部省份', value: '' },
  ...props.provinces.map((province) => ({ label: province, value: province })),
])

const promoterItems = computed(() => [
  { label: '全部推广商', value: '' },
  ...props.promoters.map((promoter) => ({ label: promoter.name, value: promoter.id })),
])

const bookItems = computed(() => [
  { label: '全部书目', value: '' },
  ...props.books.map((book) => ({ label: `${book.title} (${book.isbn})`, value: book.id })),
])
</script>

<template>
  <section class="mt-6 grid gap-6">
    <div class="panel p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-sand-900">统计报表</h2>
          <p class="mt-1 text-sm text-sand-600">按省份、推广商、书目筛选当前报备记录并统计。</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <USelect v-model="filters.term" class="w-40" :items="termItems" />
          <USelect v-model="filters.province" class="w-40" :items="provinceItems" />
          <USelect v-model="filters.promoterId" class="w-52" :items="promoterItems" />
          <USelect v-model="filters.bookId" class="w-64" :items="bookItems" />
          <UButton icon="i-lucide-download" color="neutral" variant="soft" @click="emit('export')">导出筛选明细</UButton>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap gap-3 text-sm">
        <UBadge color="primary" variant="soft">筛选后报备数：{{ reportRows.length }}</UBadge>
        <UBadge color="neutral" variant="soft">省份维度：{{ provinceStats.length }}</UBadge>
        <UBadge color="neutral" variant="soft">推广商维度：{{ promoterStats.length }}</UBadge>
        <UBadge color="neutral" variant="soft">书目维度：{{ bookStats.length }}</UBadge>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <div class="panel p-6">
        <h3 class="text-lg font-semibold text-sand-900">按省份统计</h3>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-sand-200 text-sand-500">
              <tr>
                <th class="px-3 py-3 font-medium">省份</th>
                <th class="px-3 py-3 font-medium">报备数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in provinceStats" :key="row.省份" class="border-b border-sand-100">
                <td class="px-3 py-3">{{ row.省份 }}</td>
                <td class="px-3 py-3">
                  <UButton color="primary" variant="link" class="p-0" @click="emit('open-detail', { title: `${row.省份} 报备明细`, field: 'province', value: row.省份 })">
                    {{ row.报备数量 }}
                  </UButton>
                </td>
              </tr>
              <tr v-if="!provinceStats.length">
                <td colspan="2" class="px-3 py-8 text-center text-sand-500">暂无统计数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel p-6">
        <h3 class="text-lg font-semibold text-sand-900">按推广商统计</h3>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-sand-200 text-sand-500">
              <tr>
                <th class="px-3 py-3 font-medium">推广商</th>
                <th class="px-3 py-3 font-medium">报备数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in promoterStats" :key="row.推广商" class="border-b border-sand-100">
                <td class="px-3 py-3">{{ row.推广商 }}</td>
                <td class="px-3 py-3">
                  <UButton color="primary" variant="link" class="p-0" @click="emit('open-detail', { title: `${row.推广商} 报备明细`, field: 'promoterName', value: row.推广商 })">
                    {{ row.报备数量 }}
                  </UButton>
                </td>
              </tr>
              <tr v-if="!promoterStats.length">
                <td colspan="2" class="px-3 py-8 text-center text-sand-500">暂无统计数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel p-6">
        <h3 class="text-lg font-semibold text-sand-900">按书目统计</h3>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-sand-200 text-sand-500">
              <tr>
                <th class="px-3 py-3 font-medium">书目</th>
                <th class="px-3 py-3 font-medium">报备数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in bookStats" :key="row.书目" class="border-b border-sand-100">
                <td class="px-3 py-3">{{ row.书目 }}</td>
                <td class="px-3 py-3">
                  <UButton color="primary" variant="link" class="p-0" @click="emit('open-detail', { title: `${row.书目} 报备明细`, field: 'bookLabel', value: row.书目 })">
                    {{ row.报备数量 }}
                  </UButton>
                </td>
              </tr>
              <tr v-if="!bookStats.length">
                <td colspan="2" class="px-3 py-8 text-center text-sand-500">暂无统计数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
