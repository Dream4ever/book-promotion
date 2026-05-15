function toText(value) {
  return String(value ?? '').trim()
}

function toBool(value, defaultValue = true) {
  const raw = toText(value).toLowerCase()
  if (!raw) return defaultValue
  if (['是', '接单', 'true', '1', 'yes', 'y'].includes(raw)) return true
  if (['否', '不接单', 'false', '0', 'no', 'n'].includes(raw)) return false
  return defaultValue
}

function parseTerritories(row) {
  const source =
    row['省份配置'] ||
    row['代理省份配置'] ||
    row['代理区域配置'] ||
    row['代理省份'] ||
    row['代理区域'] ||
    ''

  if (!source) return []

  return String(source)
    .split(/[\n;,；、]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [province, accepting] = chunk.split(/[:：]/)
      return {
        province: toText(province),
        accepting: toBool(accepting, true),
      }
    })
    .filter((item) => item.province)
}

export function mapSchoolRows(rows) {
  return rows
    .map((row) => ({
      province: toText(row['省份'] || row['省'] || row.province),
      name: toText(row['学校名称'] || row['学校'] || row.name),
    }))
    .filter((row) => row.province && row.name)
}

export function mapBookRows(rows) {
  return rows
    .map((row) => ({
      isbn: toText(row['ISBN'] || row.isbn),
      title: toText(row['书名'] || row['教材名称'] || row.title),
      price: Number(row['定价'] || row.price || 0),
    }))
    .filter((row) => row.isbn && row.title)
}

export function mapPromoterRows(rows) {
  return rows
    .map((row) => ({
      name: toText(row['推广商名称'] || row['推广商'] || row.name),
      contact: toText(row['联系人'] || row.contact),
      phone: toText(row['联系电话'] || row['电话'] || row.phone),
      agencyRecords: [
        {
          year: toText(row['代理年度'] || row.year || new Date().getFullYear()),
          agencyPeriod: toText(row['代理期间'] || row['代理周期'] || row.agencyPeriod),
          workload: toText(row['任务量'] || row.workload),
          territories: parseTerritories(row),
        },
      ],
    }))
    .filter((row) => row.name)
}
