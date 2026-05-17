import { describe, expect, it } from 'vitest'
import { diffById } from '../server/dbDiff.js'

describe('dbDiff', () => {
  it('returns changed rows and removed ids by row id', () => {
    expect(
      diffById(
        [
          { id: 'a', name: '旧名称' },
          { id: 'b', name: '保留' },
          { id: 'c', name: '删除' },
        ],
        [
          { id: 'a', name: '新名称' },
          { id: 'b', name: '保留' },
          { id: 'd', name: '新增' },
        ],
      ),
    ).toEqual({
      changed: [
        { id: 'a', name: '新名称' },
        { id: 'd', name: '新增' },
      ],
      removedIds: ['c'],
    })
  })
})
