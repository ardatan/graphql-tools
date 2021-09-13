export interface ParseEndpointResult {
  service: string;
  clusterBaseUrl: string;
  stage: string;
  isPrivate: boolean;
  local: boolean;
  shared: boolean;
  workspaceSlug: string | null;
  clusterName: string;
}
export declare function parseEndpoint(endpoint: string): ParseEndpointResult;
