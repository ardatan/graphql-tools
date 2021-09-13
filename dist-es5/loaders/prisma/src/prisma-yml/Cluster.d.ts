import 'isomorphic-fetch';
import { GraphQLClient } from 'graphql-request';
import { IOutput } from './Output';
export declare class Cluster {
  name: string;
  baseUrl: string;
  local: boolean;
  shared: boolean;
  clusterSecret?: string;
  requiresAuth: boolean | undefined;
  out: IOutput;
  isPrivate: boolean;
  workspaceSlug?: string;
  private cachedToken?;
  hasOldDeployEndpoint: boolean;
  custom?: boolean;
  constructor(
    out: IOutput,
    name: string,
    baseUrl: string,
    clusterSecret?: string,
    local?: boolean,
    shared?: boolean,
    isPrivate?: boolean,
    workspaceSlug?: string
  );
  getToken(serviceName: string, workspaceSlug?: string, stageName?: string): Promise<string | null>;
  getLocalToken(): string | null;
  get cloudClient(): GraphQLClient;
  generateClusterToken(serviceName: string, workspaceSlug?: string, stageName?: string): Promise<string>;
  addServiceToCloudDBIfMissing(serviceName: string, workspaceSlug?: string, stageName?: string): Promise<boolean>;
  getApiEndpoint(service: string, stage: string, workspaceSlug?: string | null): string;
  getWSEndpoint(service: string, stage: string, workspaceSlug?: string | null): string;
  getImportEndpoint(service: string, stage: string, workspaceSlug?: string | null): string;
  getExportEndpoint(service: string, stage: string, workspaceSlug?: string | null): string;
  getDeployEndpoint(): string;
  isOnline(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  request(query: string, variables?: any): Promise<Response>;
  needsAuth(): Promise<boolean>;
  toJSON(): {
    name: string;
    baseUrl: string;
    local: boolean;
    clusterSecret: string | undefined;
    shared: boolean;
    isPrivate: boolean;
    workspaceSlug: string | undefined;
  };
}
