import { describe, expect, it } from 'vitest'
import { filterOptions, getOptionsPanelState } from '../src/utils/optionFiltering.js'

const options = [
  { id: '1', label: '浙江 / 杭州一中', keywords: '浙江 杭州一中' },
  { id: '2', label: '江苏 / 南京一中', keywords: '江苏 南京一中' },
  { id: '3', label: '广东 / 广州一中', keywords: '广东 广州一中' },
]

describe('optionFiltering', () => {
  it('filters options by normalized keywords', () => {
    expect(filterOptions(options, ' 南京 ').map((item) => item.id)).toEqual(['2'])
  })

  it('limits unfiltered and filtered options separately', () => {
    expect(filterOptions(options, '', { emptyLimit: 2 }).map((item) => item.id)).toEqual(['1', '2'])
    expect(filterOptions(options, '一中', { limit: 2 }).map((item) => item.id)).toEqual(['1', '2'])
  })

  it('returns shared panel states', () => {
    expect(getOptionsPanelState({ loading: true }).kind).toBe('loading')
    expect(getOptionsPanelState({ options, filteredOptions: [], emptyText: '无匹配' })).toEqual({
      kind: 'empty',
      text: '无匹配',
    })
    expect(getOptionsPanelState({ options, filteredOptions: options, emptyText: '无匹配' }).kind).toBe('ready')
  })
})
