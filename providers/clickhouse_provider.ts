import type { ApplicationService } from '@adonisjs/core/types'
import type { ClickhouseService } from '../src/types.js'
import { defineConfig } from '../src/define_config.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    clickhouse: ClickhouseService
  }
}

export default class ClickhouseProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('clickhouse', async () => {
      const clickhouseConfig = this.app.config.get<ReturnType<typeof defineConfig>>('clickhouse')
      const { createClient } = await import('@clickhouse/client')

      return createClient(clickhouseConfig.connections[clickhouseConfig.connection])
    })
  }

  async boot() {}

  async shutdown() {
    const clickhouse = await this.app.container.make('clickhouse')
    await clickhouse.close()
  }
}
