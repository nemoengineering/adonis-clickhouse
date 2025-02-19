import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Publish config file
   */
  await codemods.makeUsingStub(stubsRoot, 'config/clickhouse.stub', {})

  /**
   * Add environment variables
   */
  await codemods.defineEnvVariables({
    CLICKHOUSE_URL: 'http://localhost:8123',
    CLICKHOUSE_USER: 'default',
    CLICKHOUSE_PASSWORD: '',
    CLICKHOUSE_DB: 'default',
  })

  /**
   * Validate environment variables
   */
  await codemods.defineEnvValidations({
    variables: {
      CLICKHOUSE_URL: `Env.schema.string({ format: 'url', tld: false })`,
      CLICKHOUSE_USER: 'Env.schema.string()',
      CLICKHOUSE_PASSWORD: 'Env.schema.string()',
      CLICKHOUSE_DB: 'Env.schema.string()',
    },
  })

  /**
   * Add provider to rc file
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@nemoventures/adonis-clickhouse/clickhouse_provider')
  })
}
