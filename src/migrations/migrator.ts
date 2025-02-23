import { createClient, NodeClickHouseClient } from '@clickhouse/client/dist/client.js'
import { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config.js'
import { MigrationBase, MigrationsRowData, QueryError } from './types.js'
import logger from '@adonisjs/core/services/logger'
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Config } from '../types.js'
import { parseSqlQueries, parseSqlSets } from './sql_parser.js'

export default class Migrator {
  readonly #connection: NodeClickHouseClientConfigOptions
  readonly #migrationsPath?: string

  constructor(config: Config) {
    this.#connection = config.connections[config.connection]
    this.#migrationsPath = config.migrationsPath
  }

  async run() {
    if (!this.#migrationsPath) {
      logger.error('Missing migration files path. Double check "config/clickhouse" file')
      process.exit(1)
    }

    const client = createClient(this.#connection)

    const migrations = this.#getMigrations(this.#migrationsPath)

    await this.#createDatabase(client)

    await this.#initMigrationsTable(client)

    await this.#applyMigrations(client, migrations)

    await client.close()
  }

  #getMigrations(migrationsPath: string): MigrationBase[] {
    let files
    try {
      files = readdirSync(migrationsPath)
    } catch (e: unknown) {
      logger.error(`No migration directory "${migrationsPath}". Please create it.`)
      process.exit(1)
    }

    const migrations: MigrationBase[] = []
    files.forEach((file: string) => {
      const version = Number(file.split('_')[0])

      if (!version) {
        logger.error(
          `A migration name should start with a number. Please check the migration "${file}" is named correctly.`
        )
        process.exit(1)
      }

      if (!file.endsWith('.sql')) return

      migrations.push({ version, file })
    })

    if (migrations.length <= 0) {
      logger.error('error', `No migrations in the "${migrationsPath}" migrations directory`)
    }

    return migrations.sort((m1, m2) => m1.version - m2.version)
  }

  async #createDatabase(
    client: NodeClickHouseClient,
    databaseEngine: string = 'ENGINE=Atomic'
  ): Promise<void> {
    const query = `CREATE DATABASE IF NOT EXISTS "${this.#connection.database}" ${databaseEngine}`

    try {
      await client.exec({ query: query, clickhouse_settings: { wait_end_of_query: 1 } })
    } catch (e: unknown) {
      logger.error(
        `Cannot create the database ${this.#connection.database}.`,
        (e as QueryError).message
      )
      process.exit(1)
    }
  }

  async #initMigrationsTable(client: NodeClickHouseClient): Promise<void> {
    const query = `CREATE TABLE IF NOT EXISTS _migrations
                   (
                       uid            UUID     DEFAULT generateUUIDv4(),
                       version        UInt32,
                       checksum       String,
                       migration_name String,
                       applied_at     DateTime DEFAULT now()
                   )
        ENGINE = MergeTree
            ORDER BY tuple(applied_at)`

    try {
      await client.exec({ query: query, clickhouse_settings: { wait_end_of_query: 1 } })
    } catch (e: unknown) {
      logger.error(`Can't create the "_migrations" table.`, (e as QueryError).message)
      process.exit(1)
    }
  }

  async #applyMigrations(client: NodeClickHouseClient, migrations: MigrationBase[]): Promise<void> {
    let migrationQueryResult: MigrationsRowData[] = []
    try {
      migrationQueryResult = await client
        .query({
          query: `SELECT version, checksum, migration_name FROM _migrations ORDER BY version`,
          format: 'JSONEachRow',
        })
        .then((result) => result.json<MigrationsRowData>())
    } catch (e: unknown) {
      logger.error(`Can't select data from the "_migrations" table.`, (e as QueryError).message)
      process.exit(1)
    }

    const migrationsApplied: MigrationsRowData[] = []
    migrationQueryResult.forEach((row: MigrationsRowData) => {
      migrationsApplied[row.version] = {
        version: row.version,
        checksum: row.checksum,
        migration_name: row.migration_name,
      }

      // Check if migration file was not removed after apply.
      const migrationExist = migrations.find(({ version }) => version === row.version)
      if (!migrationExist) {
        logger.error(
          `A migration file shouldn't be removed after apply. Please, restore the migration ${row.migration_name}.`
        )
        process.exit(1)
      }
    })

    let appliedMigrations = ''

    for (const migration of migrations) {
      const content = readFileSync(`${this.#migrationsPath}/${migration.file}`).toString()
      const checksum = createHash('md5').update(content).digest('hex')

      if (migrationsApplied[migration.version]) {
        // Check if migration file was not changed after apply.
        if (migrationsApplied[migration.version].checksum !== checksum) {
          logger.error(
            `A migration file shouldn't be changed after apply. Please, restore content of the ${
              migrationsApplied[migration.version].migration_name
            } migrations.`
          )
          process.exit(1)
        }

        // Skip if a migration is already applied.
        continue
      }

      // Extract sql from the migration.
      const queries = parseSqlQueries(content)
      const sets = parseSqlSets(content)

      for (const query of queries) {
        try {
          await client.exec({ query: query, clickhouse_settings: sets })
        } catch (e: unknown) {
          if (appliedMigrations) {
            logger.info(`The migration(s) ${appliedMigrations} was successfully applied!`)
          }

          logger.error(
            `the migrations ${migration.file} has an error. Please, fix it (be sure that already executed parts of the migration would not be run second time) and re-run migration script.`,
            (e as QueryError).message
          )
          process.exit(1)
        }
      }

      try {
        await client.insert({
          table: '_migrations',
          values: [
            { version: migration.version, checksum: checksum, migration_name: migration.file },
          ],
          format: 'JSONEachRow',
        })
      } catch (e: unknown) {
        logger.error(`Can't insert a data into the table _migrations.`, (e as QueryError).message)
        process.exit(1)
      }

      appliedMigrations = appliedMigrations
        ? appliedMigrations + ', ' + migration.file
        : migration.file
    }

    if (appliedMigrations) {
      logger.info(`The migration(s) ${appliedMigrations} was successfully applied!`)
    } else {
      logger.info(`No migrations to apply.`)
    }
  }
}
