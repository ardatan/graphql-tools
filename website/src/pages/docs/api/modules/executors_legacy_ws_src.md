# @graphql-tools/executor-legacy-ws

### Enumerations

- [LEGACY_WS](/docs/api/enums/executors_legacy_ws_src.LEGACY_WS)

### Interfaces

- [LegacyWSExecutorOpts](/docs/api/interfaces/executors_legacy_ws_src.LegacyWSExecutorOpts)

### Functions

- [buildWSLegacyExecutor](executors_legacy_ws_src#buildwslegacyexecutor)

## Functions

### buildWSLegacyExecutor

▸ **buildWSLegacyExecutor**(`subscriptionsEndpoint`, `WebSocketImpl`, `options?`):
[`Executor`](utils_src#executor)

#### Parameters

| Name                    | Type                                                                                        |
| :---------------------- | :------------------------------------------------------------------------------------------ |
| `subscriptionsEndpoint` | `string`                                                                                    |
| `WebSocketImpl`         | typeof `WebSocket`                                                                          |
| `options?`              | [`LegacyWSExecutorOpts`](/docs/api/interfaces/executors_legacy_ws_src.LegacyWSExecutorOpts) |

#### Returns

[`Executor`](utils_src#executor)

#### Defined in

[packages/executors/legacy-ws/src/index.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/legacy-ws/src/index.ts#L23)
