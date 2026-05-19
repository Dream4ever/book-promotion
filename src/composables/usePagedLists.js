import { computed, reactive, watch } from 'vue'

function paginate(rows, page, pageSize) {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

export function usePagedLists(filteredRowsByKind, search, pageSizes) {
  const kinds = Object.keys(filteredRowsByKind)
  const pages = reactive(Object.fromEntries(kinds.map((kind) => [kind, 1])))
  const pageRows = Object.fromEntries(
    kinds.map((kind) => [
      kind,
      computed(() => paginate(filteredRowsByKind[kind].value, pages[kind], pageSizes[kind])),
    ]),
  )

  for (const kind of kinds) {
    watch(
      () => filteredRowsByKind[kind].value.length,
      (length) => {
        const totalPages = Math.max(1, Math.ceil(length / pageSizes[kind]))
        if (pages[kind] > totalPages) {
          pages[kind] = totalPages
        }
      },
      { immediate: true },
    )


    watch(
      () => pageSizes[kind],
      () => {
        pages[kind] = 1
      },
    )

    if (search && Object.prototype.hasOwnProperty.call(search, kind)) {
      watch(
        () => search[kind],
        () => {
          pages[kind] = 1
        },
      )
    }
  }

  return {
    pages,
    pageRows,
  }
}
