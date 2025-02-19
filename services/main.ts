import { ClickhouseService } from '../src/types.js'
import app from '@adonisjs/core/services/app'

let clickhouse: ClickhouseService

/**
 * Returns a singleton instance of the Clickhouse client from the
 * container
 */
await app.booted(async () => {
  clickhouse = await app.container.make('clickhouse')
})

export { clickhouse as default }
