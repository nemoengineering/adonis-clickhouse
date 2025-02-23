import { CommandOptions } from '@adonisjs/core/types/ace'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { defineConfig } from '../src/define_config.js'
import Migrator from '../src/migrations/migrator.js'

export default class CacheClear extends BaseCommand {
  static commandName = 'clickhouse:migration:run'
  static description = 'Migrate database by running pending migrations'
  static options: CommandOptions = { startApp: true }

  /**
   * Force run migrations in production
   */
  @flags.boolean({ description: 'Explicitly force to run migrations in production' })
  declare force: boolean

  /**
   * Handle command
   */
  async run() {
    const clickHouseConfig = this.app.config.get<ReturnType<typeof defineConfig>>('clickhouse')

    /**
     * Continue with migrations when not in prod or force flag
     * is passed
     */
    let continueMigrations = !this.app.inProduction || this.force
    if (!continueMigrations) {
      continueMigrations = await this.takeProductionConsent()
    }

    /**
     * Do not continue when in prod and the prompt was cancelled
     */
    if (!continueMigrations) {
      return
    }

    const migrator = new Migrator(clickHouseConfig)

    await migrator.run()
  }

  /**
   * Prompts to take consent for running migrations in production
   */
  protected async takeProductionConsent(): Promise<boolean> {
    const question = 'You are in production environment. Want to continue running migrations?'
    try {
      return await this.prompt.confirm(question)
    } catch (error) {
      return false
    }
  }
}
