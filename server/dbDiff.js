function mapById(rows) {
  return new Map((rows || []).map((row) => [row.id, row]))
}

function isChanged(previous, next) {
  return JSON.stringify(previous || null) !== JSON.stringify(next || null)
}

export function diffById(previousRows, nextRows) {
  const previousById = mapById(previousRows)
  const nextById = mapById(nextRows)
  const changed = []
  const removedIds = []

  for (const [id, next] of nextById) {
    if (!previousById.has(id) || isChanged(previousById.get(id), next)) {
      changed.push(next)
    }
  }

  for (const [id] of previousById) {
    if (!nextById.has(id)) {
      removedIds.push(id)
    }
  }

  return { changed, removedIds }
}
