import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'

export const BASE_URL = new URL('./tmp/', import.meta.url)

async function setupConfigureCommand() {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }

        return import(filePath)
      },
    })

  const app = ignitor.createApp('web')
  await app.init()
  await app.boot()

  const ace = await app.container.make('ace')
  const command = await ace.create(Configure, ['../../index.js'])

  command.ui.switchMode('raw')

  return { command }
}

test.group('Configure', (group) => {
  group.each.setup(({ context }) => {
    context.fs.baseUrl = BASE_URL
    context.fs.basePath = fileURLToPath(BASE_URL)
  })

  group.tap((t) => t.timeout(60 * 1000))

  test('publish config file', async ({ assert }) => {
    const { command } = await setupConfigureCommand()

    await command.exec()

    await assert.fileExists('config/clickhouse.ts')
    await assert.fileContains('config/clickhouse.ts', 'const clickHouseConfig = defineConfig({')
    await assert.fileContains('config/clickhouse.ts', 'export default clickHouseConfig')
    await assert.fileContains(
      'config/clickhouse.ts',
      `declare module '@nemoventures/adonis-clickhouse/types'`
    )
  })

  test('add clickhouse_provider to the rc file', async ({ fs, assert }) => {
    await fs.createJson('tsconfig.json', {})
    await fs.create('adonisrc.ts', `export default defineConfig({})`)

    const { command } = await setupConfigureCommand()
    await command.exec()

    await assert.fileExists('adonisrc.ts')
    await assert.fileContains(
      'adonisrc.ts',
      `providers: [() => import('@nemoventures/adonis-clickhouse/clickhouse_provider')]`
    )
  })

  test('add env variables for the selected drivers', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', {})
    await fs.create('.env', '')
    await fs.create('start/env.ts', `export default Env.create(new URL('./'), {})`)
    await fs.create('adonisrc.ts', `export default defineConfig({})`)

    const { command } = await setupConfigureCommand()
    await command.exec()

    await assert.fileContains('.env', 'CLICKHOUSE_URL=http://localhost:8123')
    await assert.fileContains('.env', 'CLICKHOUSE_USERNAME=default')
    await assert.fileContains('.env', 'CLICKHOUSE_PASSWORD=')
    await assert.fileContains('.env', 'CLICKHOUSE_DB=default')

    await assert.fileContains(
      'start/env.ts',
      `CLICKHOUSE_URL: Env.schema.string({ format: 'url', tld: false })`
    )
    await assert.fileContains('start/env.ts', 'CLICKHOUSE_USERNAME: Env.schema.string()')
    await assert.fileContains('start/env.ts', `CLICKHOUSE_PASSWORD: Env.schema.string()`)
    await assert.fileContains('start/env.ts', 'CLICKHOUSE_DB: Env.schema.string()')
  })
})
