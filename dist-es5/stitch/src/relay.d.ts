import { SubschemaConfig } from '@graphql-tools/delegate';
export declare function handleRelaySubschemas(
  subschemas: SubschemaConfig[],
  getTypeNameFromId?: (id: string) => string
): SubschemaConfig<any, any, any, Record<string, any>>[];
