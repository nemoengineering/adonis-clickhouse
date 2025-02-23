// Extract sql queries from migrations.
export const parseSqlQueries = (content: string): string[] =>
  content
    .replace(/(--|#!|#\s).*(\n|\r\n|\r|$)/gm, '\n')
    .replace(/^\s*(SET\s).*(\n|\r\n|\r|$)/gm, '')
    .replace(/(\n|\r\n|\r)/gm, ' ')
    .replace(/\s+/g, ' ')
    .split(';')
    .map((el: string) => el.trim())
    .filter((el: string) => el.length !== 0)

// Extract query settings from migrations.
export const parseSqlSets = (content: string) => {
  const sets: { [key: string]: string } = {}

  const setsList = content
    .replace(/(--|#!|#\s).*(\n|\r\n|\r|$)/gm, '\n')
    .replace(/^\s*(?!SET\s).*(\n|\r\n|\r|$)/gm, '')
    .replace(/^\s*(SET\s)/gm, '')
    .replace(/(\n|\r\n|\r)/gm, ' ')
    .replace(/\s+/g, '')
    .split(';')

  setsList.forEach((setFull) => {
    const set = setFull.split('=')
    if (set[0]) {
      sets[set[0]] = set[1]
    }
  })

  return sets
}
