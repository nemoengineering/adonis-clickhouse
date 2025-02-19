import { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config.js'
import { NodeClickHouseClient } from '@clickhouse/client/dist/client.js'

/**
 * A list of multiple connections defined inside the user
 * config file
 */
export type ClickhouseConnectionsList = Record<string, NodeClickHouseClientConfigOptions>

/**
 * List of connections inferred from user config
 */
export interface ClickhouseConnections {}
export type InferConnections<T extends { connections: ClickhouseConnectionsList }> =
  T['connections']

/**
 * Clickhouse service is a singleton Clickhouse instance registered
 * with the container based upon user defined config
 */
export interface ClickhouseService extends NodeClickHouseClient {}
