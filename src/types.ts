import { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config.js'
import { NodeClickHouseClient } from '@clickhouse/client/dist/client.js'

/**
 * A list of multiple connections defined inside the user
 * config file
 */
export type ClickHouseConnectionsList = Record<string, NodeClickHouseClientConfigOptions>

/**
 * List of connections inferred from user config
 */
export interface ClickHouseConnections {}
export type InferConnections<T extends { connections: ClickHouseConnectionsList }> =
  T['connections']

/**
 * ClickHouse service is a singleton ClickHouse instance registered
 * with the container based upon user defined config
 */
export interface ClickHouseService extends NodeClickHouseClient {}
