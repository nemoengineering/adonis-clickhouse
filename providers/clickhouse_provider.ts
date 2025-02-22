import type { ApplicationService } from '@adonisjs/core/types'
import type { ClickHouseService } from '../src/types.js'
import { defineConfig } from '../src/define_config.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    clickhouse: ClickHouseService
  }
}

export default class ClickHouseProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('clickhouse', async () => {
      const clickHouseConfig = this.app.config.get<ReturnType<typeof defineConfig>>('clickhouse')
      const { createClient } = await import('@clickhouse/client')

      return createClient(clickHouseConfig.connections[clickHouseConfig.connection])
    })
  }

  async boot() {}

  async shutdown() {
    const clickHouse = await this.app.container.make('clickhouse')
    await clickHouse.close()
  }
}
