export function normalizeOptionKeyword(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function filterOptions(options, query, { limit = 20, emptyLimit = limit } = {}) {
  const keyword = normalizeOptionKeyword(query)
  const rows = keyword
    ? options.filter((option) => normalizeOptionKeyword(option.keywords || option.label).includes(keyword))
    : options

  return rows.slice(0, keyword ? limit : emptyLimit)
}

export function getOptionsPanelState({ loading = false, options = [], filteredOptions = [], emptyText = '' }) {
  if (loading) {
    return { kind: 'loading', text: '加载中...' }
  }

  if (!options.length) {
    return { kind: 'empty', text: emptyText }
  }

  if (!filteredOptions.length) {
    return { kind: 'empty', text: emptyText }
  }

  return { kind: 'ready', text: '' }
}
