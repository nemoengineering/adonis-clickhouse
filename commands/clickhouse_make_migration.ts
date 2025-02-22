import { args, BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { defineConfig } from '../src/define_config.js'
import { stubsRoot } from '../stubs/main.js'

export default class CacheClear extends BaseCommand {
  static commandName = 'clickhouse:make:migration'
  static description = 'Make a new ClickHouse migration file'
  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Name of the migration file' })
  declare name: string

  /**
   * Handle command
   */
  async run() {
    const clickHouseConfig = this.app.config.get<ReturnType<typeof defineConfig>>('clickhouse')

    if (!clickHouseConfig.migrationsPath) {
      this.logger.error('Missing migration files path. Double check "config/clickhouse" file')
      this.exitCode = 1
      return
    }

    const prefix = new Date().getTime()
    const fileName = `${prefix}_${this.name}.sql`

    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, `commands/make_migration.stub`, {
      migrationsPath: clickHouseConfig.migrationsPath,
      fileName,
    })
  }
}
