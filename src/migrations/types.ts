export type MigrationBase = {
  version: number
  file: string
}

export type QueryError = {
  message: string
}

export type MigrationsRowData = {
  version: number
  checksum: string
  migration_name: string
}
