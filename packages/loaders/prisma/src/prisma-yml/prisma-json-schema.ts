export interface PrismaDefinition {
  datamodel?: string | string[];
  subscriptions?: SubscriptionMap;
  custom?: any;
  secret?: string;
  disableAuth?: boolean;
  seed?: Seed;
  endpoint?: string;
  hooks?: any;
  generate?: Generate[];
  databaseType?: DatabaseType;
}

export type DatabaseType = 'relational' | 'document';

export interface Generate {
  generator: string;
  output: string;
}

export interface Seed {
  import?: string;
  run?: string;
}

export interface SubscriptionMap {
  [subscriptionName: string]: SubscriptionDefinition;
}

export interface SubscriptionDefinition {
  query: string;
  webhook: FunctionHandlerWebhookSource;
}

export type FunctionHandlerWebhookSource = string | FunctionHandlerWebhookWithHeaders;

export interface FunctionHandlerWebhookWithHeaders {
  url: string;
  headers?: Headers;
}

export interface Headers {
  [key: string]: string;
}
