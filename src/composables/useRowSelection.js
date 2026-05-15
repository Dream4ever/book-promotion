import { reactive } from 'vue'

export function useRowSelection(kinds) {
  const selectedIds = reactive(Object.fromEntries(kinds.map((kind) => [kind, []])))

  function clearSelections(kind) {
    selectedIds[kind] = []
  }

  function clearAllSelections() {
    kinds.forEach(clearSelections)
  }

  function isSelected(kind, id) {
    return selectedIds[kind].includes(id)
  }

  function toggleRowSelection(kind, id, checked) {
    selectedIds[kind] = checked
      ? Array.from(new Set([...selectedIds[kind], id]))
      : selectedIds[kind].filter((item) => item !== id)
  }

  function areAllSelected(kind, rows) {
    return rows.length > 0 && rows.every((row) => selectedIds[kind].includes(row.id))
  }

  function toggleAllSelection(kind, rows, checked) {
    selectedIds[kind] = checked ? rows.map((row) => row.id) : []
  }

  return {
    selectedIds,
    clearSelections,
    clearAllSelections,
    isSelected,
    toggleRowSelection,
    areAllSelected,
    toggleAllSelection,
  }
}
