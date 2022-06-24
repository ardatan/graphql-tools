import { Args } from './types/common.js';
import { Cluster } from './Cluster.js';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ClusterNotFound } from './errors/ClusterNotFound.js';
import { Variables } from './Variables.js';
import { IOutput, Output } from './Output.js';
import * as path from 'path';
import 'isomorphic-fetch';
import { RC } from './index.js';
import { ClusterNotSet } from './errors/ClusterNotSet.js';
import { clusterEndpointMap } from './constants.js';
import { getProxyAgent } from './utils/getProxyAgent.js';
// eslint-disable-next-line
// @ts-ignore
import jwt from 'jsonwebtoken';
import debugPkg from 'debug';

const debug = debugPkg('Environment');

export class Environment {
  sharedClusters: string[] = ['prisma-eu1', 'prisma-us1'];
  clusterEndpointMap = clusterEndpointMap;
  args: Args | undefined;
  activeCluster: Cluster | undefined;
  globalRC: RC = {};
  clusters: Cluster[] | undefined;
  out: IOutput;
  home: string;
  rcPath: string;
  clustersFetched = false;
  version?: string;
  constructor(home: string, out: IOutput = new Output(), version?: string) {
    this.out = out;
    this.home = home;
    this.version = version;

    this.rcPath = path.join(this.home, '.prisma/config.yml');
    fs.mkdirSync(path.dirname(this.rcPath), { recursive: true });
  }

  private _getClusters() {
    const clusters = this.clusters;
    if (clusters === undefined) {
      throw new Error(`Cannot get clusters. Did you forget to call "Environment.load()"?`);
    }
    return clusters;
  }

  async load() {
    await this.loadGlobalRC();
  }

  get cloudSessionKey(): string | undefined {
    return process.env['PRISMA_CLOUD_SESSION_KEY'] || this.globalRC.cloudSessionKey;
  }

  async renewToken() {
    if (this.cloudSessionKey) {
      const data: any = jwt.decode(this.cloudSessionKey);
      if (!data.exp) {
        return;
      }
      const timeLeft = data.exp * 1000 - Date.now();
      if (timeLeft < 1000 * 60 * 60 * 24 && timeLeft > 0) {
        try {
          const res = await this.requestCloudApi(`
          mutation {
            renewToken
          }
        `);
          if (res.renewToken) {
            this.globalRC.cloudSessionKey = res.renewToken;
            this.saveGlobalRC();
          }
        } catch (e: any) {
          debug(e);
        }
      }
    }
  }

  async fetchClusters() {
    if (!this.clustersFetched && this.cloudSessionKey) {
      const renewPromise = this.renewToken();
      try {
        const res = (await Promise.race([
          this.requestCloudApi(`
            query prismaCliGetClusters {
              me {
                memberships {
                  workspace {
                    id
                    slug
                    clusters {
                      id
                      name
                      connectInfo {
                        endpoint
                      }
                      customConnectionInfo {
                        endpoint
                      }
                    }
                  }
                }
              }
            }
          `),
          // eslint-disable-next-line
          new Promise((_, r) => setTimeout(() => r(), 6000)),
        ])) as any;
        if (!res) {
          return;
        }
        if (res.me && res.me.memberships && Array.isArray(res.me.memberships)) {
          // clean up all prisma-eu1 and prisma-us1 clusters if they already exist
          this.clusters = this._getClusters().filter(c => c.name !== 'prisma-eu1' && c.name !== 'prisma-us1');

          for (const m of res.me.memberships) {
            for (const cluster of m.workspace.clusters) {
              const endpoint = cluster.connectInfo
                ? cluster.connectInfo.endpoint
                : cluster.customConnectionInfo
                ? cluster.customConnectionInfo.endpoint
                : this.clusterEndpointMap[cluster.name];
              this.addCluster(
                new Cluster(
                  this.out,
                  cluster.name,
                  endpoint,
                  this.globalRC.cloudSessionKey,
                  false,
                  ['prisma-eu1', 'prisma-us1'].includes(cluster.name),
                  !['prisma-eu1', 'prisma-us1'].includes(cluster.name),
                  m.workspace.slug
                )
              );
            }
          }
        }
      } catch (e: any) {
        debug(e);
      }
      await renewPromise;
    }
  }

  clusterByName(name: string, throws = false): Cluster | undefined {
    if (!this.clusters) {
      return;
    }
    const cluster = this.clusters.find(c => c.name === name);
    if (!throws) {
      return cluster;
    }

    if (!cluster) {
      if (!name) {
        throw new ClusterNotSet();
      }
      throw new ClusterNotFound(name);
    }

    return cluster;
  }

  setToken(token: string | undefined) {
    this.globalRC.cloudSessionKey = token;
  }

  addCluster(cluster: Cluster) {
    const clusters = this._getClusters();
    const existingClusterIndex = clusters.findIndex(c => {
      if (cluster.workspaceSlug) {
        return c.workspaceSlug === cluster.workspaceSlug && c.name === cluster.name;
      } else {
        return c.name === cluster.name;
      }
    });
    if (existingClusterIndex > -1) {
      clusters.splice(existingClusterIndex, 1);
    }
    clusters.push(cluster);
  }

  removeCluster(name: string) {
    this.clusters = this._getClusters().filter(c => c.name !== name);
  }

  saveGlobalRC() {
    const rc = {
      cloudSessionKey: this.globalRC.cloudSessionKey ? this.globalRC.cloudSessionKey.trim() : undefined,
      clusters: this.getLocalClusterConfig(),
    };
    // parse & stringify to rm undefined for yaml parser
    const rcString = yaml.dump(JSON.parse(JSON.stringify(rc)));
    fs.writeFileSync(this.rcPath, rcString);
  }

  setActiveCluster(cluster: Cluster) {
    this.activeCluster = cluster;
  }

  async loadGlobalRC(): Promise<void> {
    if (this.rcPath) {
      try {
        fs.accessSync(this.rcPath);
        const globalFile = fs.readFileSync(this.rcPath, 'utf-8');
        await this.parseGlobalRC(globalFile);
      } catch {
        await this.parseGlobalRC();
      }
    } else {
      await this.parseGlobalRC();
    }
  }

  async parseGlobalRC(globalFile?: string): Promise<void> {
    if (globalFile) {
      this.globalRC = await this.loadYaml(globalFile, this.rcPath);
    }
    this.clusters = this.initClusters(this.globalRC);
  }

  private async loadYaml(file: string | null, filePath: string | null = null): Promise<any> {
    if (file) {
      let content;
      try {
        content = yaml.load(file);
      } catch (e: any) {
        throw new Error(`Yaml parsing error in ${filePath}: ${e.message}`);
      }
      const variables = new Variables(filePath || 'no filepath provided', this.args, this.out);
      content = await variables.populateJson(content);

      return content;
    } else {
      return {};
    }
  }

  private initClusters(rc: RC): Cluster[] {
    const sharedClusters = this.getSharedClusters(rc);
    return [...sharedClusters];
  }

  private getSharedClusters(rc: RC): Cluster[] {
    return this.sharedClusters.map(clusterName => {
      return new Cluster(
        this.out,
        clusterName,
        this.clusterEndpointMap[clusterName],
        rc && rc.cloudSessionKey,
        false,
        true
      );
    });
  }

  private getLocalClusterConfig() {
    return this._getClusters()
      .filter(c => !c.shared && c.clusterSecret !== this.cloudSessionKey && !c.isPrivate)
      .reduce((acc, cluster) => {
        return {
          ...acc,
          [cluster.name]: {
            host: cluster.baseUrl,
            clusterSecret: cluster.clusterSecret,
          },
        };
      }, {});
  }

  private async requestCloudApi(query: string) {
    const res = await fetch('https://api.cloud.prisma.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.cloudSessionKey}`,
        'X-Cli-Version': this.version,
      } as any,
      body: JSON.stringify({
        query,
      }),
      proxy: getProxyAgent('https://api.cloud.prisma.sh'),
    } as any);
    const json = await res.json();
    return json.data;
  }
}

export const isLocal = (hostname: any) => hostname.includes('localhost') || hostname.includes('127.0.0.1');
