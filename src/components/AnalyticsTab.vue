<script setup>
defineProps({
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
          <select v-model="filters.term" class="field-input w-40">
            <option value="">全部学期</option>
            <option v-for="term in termOptions" :key="term" :value="term">{{ term }}</option>
          </select>
          <select v-model="filters.province" class="field-input w-40">
            <option value="">全部省份</option>
            <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
          </select>
          <select v-model="filters.promoterId" class="field-input w-52">
            <option value="">全部推广商</option>
            <option v-for="promoter in promoters" :key="promoter.id" :value="promoter.id">{{ promoter.name }}</option>
          </select>
          <select v-model="filters.bookId" class="field-input w-64">
            <option value="">全部书目</option>
            <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }} ({{ book.isbn }})</option>
          </select>
          <button type="button" class="secondary-button" @click="emit('export')">导出筛选明细</button>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap gap-3 text-sm">
        <span class="tag">筛选后报备数：{{ reportRows.length }}</span>
        <span class="tag">省份维度：{{ provinceStats.length }}</span>
        <span class="tag">推广商维度：{{ promoterStats.length }}</span>
        <span class="tag">书目维度：{{ bookStats.length }}</span>
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
                  <button type="button" class="text-pine-600 underline-offset-4 hover:underline" @click="emit('open-detail', { title: `${row.省份} 报备明细`, field: 'province', value: row.省份 })">
                    {{ row.报备数量 }}
                  </button>
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
                  <button type="button" class="text-pine-600 underline-offset-4 hover:underline" @click="emit('open-detail', { title: `${row.推广商} 报备明细`, field: 'promoterName', value: row.推广商 })">
                    {{ row.报备数量 }}
                  </button>
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
                  <button type="button" class="text-pine-600 underline-offset-4 hover:underline" @click="emit('open-detail', { title: `${row.书目} 报备明细`, field: 'bookLabel', value: row.书目 })">
                    {{ row.报备数量 }}
                  </button>
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
