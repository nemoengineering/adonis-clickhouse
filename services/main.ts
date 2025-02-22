import { ClickHouseService } from '../src/types.js'
import app from '@adonisjs/core/services/app'

let clickhouse: ClickHouseService

/**
 * Returns a singleton instance of the ClickHouse client from the
 * container
 */
await app.booted(async () => {
  clickhouse = await app.container.make('clickhouse')
})

export { clickhouse as default }
