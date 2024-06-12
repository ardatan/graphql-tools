export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Timestamp: { input: any; output: any };
};

export type FetchError = {
  __typename?: 'FetchError';
  code: FetchErrorCode;
  message: Scalars['String']['output'];
  /** Minimum delay before the next fetch should occur, in seconds. */
  minDelaySeconds: Scalars['Float']['output'];
};

export enum FetchErrorCode {
  /** This token does not have access to fetch the schema for this ref. Do not retry. */
  AccessDenied = 'ACCESS_DENIED',
  /** This token provided is not a valid graph token. Do not retry. */
  AuthenticationFailed = 'AUTHENTICATION_FAILED',
  /** This instance of Uplink does not support this feature. Please try another instance. */
  NotImplementedOnThisInstance = 'NOT_IMPLEMENTED_ON_THIS_INSTANCE',
  /** An internal server error occurred. Please retry with some backoff. */
  RetryLater = 'RETRY_LATER',
  /** The graphRef passed is not a valid ref or no configuration for that ref is found. Please retry with some backoff, eg in case of undeletion. */
  UnknownRef = 'UNKNOWN_REF',
}

export type Message = {
  __typename?: 'Message';
  body: Scalars['String']['output'];
  level: MessageLevel;
};

export enum MessageLevel {
  Error = 'ERROR',
  Info = 'INFO',
  Warn = 'WARN',
}

/** A chunk of persisted queries */
export type PersistedQueriesChunk = {
  __typename?: 'PersistedQueriesChunk';
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** The chunk can be downloaded from any of those URLs, which might be transient. */
  urls: Array<Scalars['String']['output']>;
};

export type PersistedQueriesResponse = FetchError | PersistedQueriesResult | Unchanged;

export type PersistedQueriesResult = {
  __typename?: 'PersistedQueriesResult';
  /** List of URLs chunks are to be fetched from; chunks should be cached by ID between updates. null indicates there is no configured persisted query list. */
  chunks?: Maybe<Array<PersistedQueriesChunk>>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Minimum delay before the next fetch should occur, in seconds. */
  minDelaySeconds: Scalars['Float']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Fetch the persisted queries for a router. */
  persistedQueries: PersistedQueriesResponse;
  /** Fetch the configuration for a router. */
  routerConfig: RouterConfigResponse;
  /** Fetch the current entitlements for a router. */
  routerEntitlements: RouterEntitlementsResponse;
};

export type QueryPersistedQueriesArgs = {
  apiKey: Scalars['String']['input'];
  ifAfterId?: InputMaybe<Scalars['ID']['input']>;
  ref: Scalars['String']['input'];
};

export type QueryRouterConfigArgs = {
  apiKey: Scalars['String']['input'];
  ifAfterId?: InputMaybe<Scalars['ID']['input']>;
  ref: Scalars['String']['input'];
};

export type QueryRouterEntitlementsArgs = {
  apiKey: Scalars['String']['input'];
  ifAfterId?: InputMaybe<Scalars['ID']['input']>;
  ref: Scalars['String']['input'];
};

export type RouterConfigResponse = FetchError | RouterConfigResult | Unchanged;

export type RouterConfigResult = {
  __typename?: 'RouterConfigResult';
  /** Variant-unique identifier. */
  id: Scalars['ID']['output'];
  /** Messages that should be reported back to the operators of this router, eg through logs and/or monitoring. */
  messages: Array<Message>;
  /** Minimum delay before the next fetch should occur, in seconds. */
  minDelaySeconds: Scalars['Float']['output'];
  /** The configuration as core schema. */
  supergraphSDL: Scalars['String']['output'];
};

export type RouterEntitlement = {
  __typename?: 'RouterEntitlement';
  /** Which audiences this entitlemnt applies to. Cloud and on-premise routers each require the presence of their own audience. */
  audience: Array<RouterEntitlementAudience>;
  /** Router should stop serving requests after this time if commercial features are in use. */
  haltAt?: Maybe<Scalars['Timestamp']['output']>;
  /** RFC 8037 Ed25519 JWT signed representation of sibling fields. */
  jwt: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  /** Router should warn users after this time if commercial features are in use. */
  warnAt?: Maybe<Scalars['Timestamp']['output']>;
};

export enum RouterEntitlementAudience {
  Cloud = 'CLOUD',
  SelfHosted = 'SELF_HOSTED',
}

export type RouterEntitlementsResponse = FetchError | RouterEntitlementsResult | Unchanged;

export type RouterEntitlementsResult = {
  __typename?: 'RouterEntitlementsResult';
  /** The best available entitlement if any. May have expired already. */
  entitlement?: Maybe<RouterEntitlement>;
  /** Unique identifier for this result, to be passed in as `entitlements(unlessId:)`. */
  id: Scalars['ID']['output'];
  /** Minimum delay before the next fetch should occur, in seconds. */
  minDelaySeconds: Scalars['Float']['output'];
};

/** Response indicating the router configuration available is not newer than the one passed in `ifAfterId`, or the router entitlements currently match `unlessId`. */
export type Unchanged = {
  __typename?: 'Unchanged';
  /** Variant-unique identifier for the configuration that remains in place. */
  id: Scalars['ID']['output'];
  /** Minimum delay before the next fetch should occur, in seconds. */
  minDelaySeconds: Scalars['Float']['output'];
};

export type RouterConfigQueryVariables = Exact<{
  apiKey: Scalars['String']['input'];
  graphRef: Scalars['String']['input'];
  lastSeenId?: InputMaybe<Scalars['ID']['input']>;
}>;

export type RouterConfigQuery = {
  __typename?: 'Query';
  routerConfig:
    | { __typename: 'FetchError'; code: FetchErrorCode; message: string; minDelaySeconds: number }
    | {
        __typename: 'RouterConfigResult';
        id: string;
        minDelaySeconds: number;
        supergraphSdl: string;
        messages: Array<{ __typename?: 'Message'; level: MessageLevel; body: string }>;
      }
    | { __typename: 'Unchanged'; id: string; minDelaySeconds: number };
};
