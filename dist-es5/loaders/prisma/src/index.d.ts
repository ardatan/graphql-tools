import { UrlLoader, LoadFromUrlOptions } from '@graphql-tools/url-loader';
/**
 * additional options for loading from a `prisma.yml` file
 */
export interface PrismaLoaderOptions extends LoadFromUrlOptions {
  envVars?: {
    [key: string]: string;
  };
  graceful?: boolean;
  cwd?: string;
}
/**
 * This loader loads a schema from a `prisma.yml` file
 */
export declare class PrismaLoader extends UrlLoader {
  canLoadSync(): boolean;
  canLoad(prismaConfigFilePath: string, options: PrismaLoaderOptions): Promise<boolean>;
  load(prismaConfigFilePath: string, options: PrismaLoaderOptions): Promise<import('@graphql-tools/utils').Source[]>;
}
