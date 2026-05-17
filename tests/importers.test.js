import { describe, expect, it } from 'vitest'
import { mapBookRows, mapPromoterRows, mapSchoolRows } from '../src/utils/importers.js'

describe('importers', () => {
  it('maps school aliases and skips incomplete rows', () => {
    expect(
      mapSchoolRows([
        { 省: '浙江', 学校: '杭州一中' },
        { 省份: '江苏' },
      ]),
    ).toEqual([{ province: '浙江', name: '杭州一中' }])
  })

  it('maps book aliases and numeric price', () => {
    expect(mapBookRows([{ ISBN: '978-1', 教材名称: '语文同步', 定价: '39.8' }])).toEqual([
      { isbn: '978-1', title: '语文同步', price: 39.8 },
    ])
  })

  it('maps promoter yearly agency records and territory accepting flags', () => {
    expect(
      mapPromoterRows([
        {
          推广商: '华东推广',
          联系人: '张三',
          电话: '13800000000',
          代理年度: '2026',
          代理期间: '2026.01-2026.12',
          任务量: '50 校',
          代理省份配置: '浙江:接单；江苏:不接单',
        },
      ]),
    ).toEqual([
      {
        name: '华东推广',
        contact: '张三',
        phone: '13800000000',
        agencyRecords: [
          {
            year: '2026',
            agencyPeriod: '2026.01-2026.12',
            workload: '50 校',
            territories: [
              { province: '浙江', accepting: true },
              { province: '江苏', accepting: false },
            ],
          },
        ],
      },
    ])
  })
})
