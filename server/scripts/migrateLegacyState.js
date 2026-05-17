import { migrateLegacyState } from '../db.js'

const force = process.argv.includes('--force')

try {
  const result = await migrateLegacyState({ force })
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
