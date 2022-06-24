import { UrlLoader, LoadFromUrlOptions } from '@graphql-tools/url-loader';
import { PrismaDefinitionClass, Environment } from './prisma-yml/index.js';
import { join } from 'path';
import { promises as fsPromises } from 'fs';
import { homedir } from 'os';
import { cwd } from 'process';

const { access } = fsPromises;

/**
 * additional options for loading from a `prisma.yml` file
 */
export interface PrismaLoaderOptions extends LoadFromUrlOptions {
  envVars?: { [key: string]: string };
  graceful?: boolean;
  cwd?: string;
}

/**
 * This loader loads a schema from a `prisma.yml` file
 */
export class PrismaLoader extends UrlLoader {
  canLoadSync() {
    return false;
  }

  async canLoad(prismaConfigFilePath: string, options: PrismaLoaderOptions): Promise<boolean> {
    if (typeof prismaConfigFilePath === 'string' && prismaConfigFilePath.endsWith('prisma.yml')) {
      const joinedYmlPath = join(options.cwd || cwd(), prismaConfigFilePath);
      try {
        await access(joinedYmlPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async load(prismaConfigFilePath: string, options: PrismaLoaderOptions) {
    if (!(await this.canLoad(prismaConfigFilePath, options))) {
      return [];
    }
    const { graceful, envVars } = options;
    const home = homedir();
    const env = new Environment(home);
    await env.load();
    const joinedYmlPath = join(options.cwd || cwd(), prismaConfigFilePath);
    const definition = new PrismaDefinitionClass(env, joinedYmlPath, envVars);
    await definition.load({}, undefined, graceful);
    const serviceName = definition.service!;
    const stage = definition.stage!;
    const clusterName = definition.cluster;
    if (!clusterName) {
      throw new Error(`No cluster set. Please set the "cluster" property in your prisma.yml`);
    }
    const cluster = await definition.getCluster();
    if (!cluster) {
      throw new Error(
        `Cluster ${clusterName} provided in prisma.yml could not be found in global ~/.prisma/config.yml.
      Please check in ~/.prisma/config.yml, if the cluster exists.
      You can use \`docker-compose up -d\` to start a new cluster.`
      );
    }
    const token = definition.getToken(serviceName, stage);
    const url = cluster.getApiEndpoint(serviceName, stage, definition.getWorkspace() || undefined);
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined;
    return super.load(url, { headers });
  }
}
