import { createServer, Server } from 'http';
import { GraphQLSchema } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { getSubgraph1Schema } from './subgraph1';
import { getSubgraph2Schema } from './subgraph2';

interface PortMap {
  subgraph1: number;
  subgraph2: number;
}

export class TestEnvironment {
  private supergraphSchema?: GraphQLSchema;
  private readonly gateway: ApolloGateway;
  private readonly portMap: PortMap = {
    subgraph1: this.getTestPort() + 1001,
    subgraph2: this.getTestPort() + 1002,
  };

  private yogaGateway?: Server;
  private readonly subgraph1: Server;
  private readonly subgraph2: Server;

  constructor() {
    this.subgraph1 = createServer(createYoga({ schema: getSubgraph1Schema() }));
    this.subgraph2 = createServer(createYoga({ schema: getSubgraph2Schema() }));

    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs: [
          { name: 'subgraph1', url: `http://localhost:${this.portMap.subgraph1}/graphql` },
          { name: 'subgraph2', url: `http://localhost:${this.portMap.subgraph2}/graphql` },
        ],
      }),
    });
  }

  public async start(): Promise<void> {
    // start subgraphs
    await Promise.all([
      new Promise<void>(resolve => this.subgraph1.listen(this.portMap.subgraph1, () => resolve())),
      new Promise<void>(resolve => this.subgraph2.listen(this.portMap.subgraph2, () => resolve())),
    ]);
    // compose supergraph schema
    await Promise.all([this.waitForSchemaIsLoaded(), this.gateway.load()]);
    // start yoga geteway
    this.yogaGateway = createServer(
      createYoga({ schema: this.getSupergraphSchema(), maskedErrors: false }),
    );
    await new Promise<void>(resolve =>
      this.yogaGateway?.listen(this.getTestPort(), () => resolve()),
    );
  }

  public async stop(): Promise<void> {
    // stop yoga geteway
    await new Promise<void>((resolve, reject) =>
      this.yogaGateway?.close(error => (error ? reject(error) : resolve())),
    );
    // stop subgraphs
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        this.subgraph1.close(error => (error ? reject(error) : resolve())),
      ),
      new Promise<void>((resolve, reject) =>
        this.subgraph2.close(error => (error ? reject(error) : resolve())),
      ),
    ]);
  }

  public getSupergraphSchema(): GraphQLSchema {
    if (this.supergraphSchema) {
      return this.supergraphSchema;
    }

    throw new Error('Supergraph schema is not available!');
  }

  public getTestPort(): number {
    return parseInt(process.env['JEST_WORKER_ID'] ?? '1') + 3000;
  }

  private async waitForSchemaIsLoaded(): Promise<void> {
    return new Promise<void>(resolve => {
      this.gateway.onSchemaLoadOrUpdate(({ coreSupergraphSdl: supergraphSdl }) => {
        const schema = getStitchedSchemaFromSupergraphSdl({ supergraphSdl });
        this.supergraphSchema = schema;
        resolve();
      });
    });
  }
}
