import { Server } from 'http';
import { AddressInfo } from 'net';
import { Readable } from 'stream';

import express, { Express } from 'express';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { buildSchema, GraphQLSchema, parse } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { createServerHttpLink, GraphQLUpload as ServerGraphQLUpload, linkToExecutor } from '../src/index.js';
import { execute } from '@graphql-tools/executor';

function streamToString(stream: Readable) {
  const chunks: Array<Buffer> = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function startServer(e: Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    e.listen(undefined as any, 'localhost', function (this: any, error: Error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    } as any);
  });
}

function testGraphqlMultipartRequest(query: string, port: number) {
  const body = new FormData();

  body.append(
    'operations',
    JSON.stringify({
      query,
      variables: {
        file: null,
      },
    })
  );
  body.append('map', '{ "1": ["variables.file"] }');
  body.append('1', 'abc', { filename: __filename });

  return fetch(`http://localhost:${port.toString()}`, {
    method: 'POST',
    body,
  });
}

function getBasicGraphQLMiddleware(schema: GraphQLSchema) {
  return (req: any, res: any) => {
    Promise.resolve().then(async () => {
      const { query, variables, operationName } = req.body;
      const result = await execute({
        schema,
        document: parse(query),
        variableValues: variables,
        operationName,
      });
      res.json(result);
    });
  };
}

describe('graphql upload', () => {
  let remoteServer: Server;
  let remotePort: number;
  let gatewayServer: Server;
  let gatewayPort: number;

  beforeAll(async () => {
    const remoteSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar Upload
        type Query {
          version: String
        }
        type Mutation {
          upload(file: Upload): String
        }
      `,
      resolvers: {
        Mutation: {
          upload: async (_root, { file }) => {
            const { createReadStream } = await file;
            const stream = createReadStream();
            const s = await streamToString(stream);
            return s;
          },
        },
        Upload: GraphQLUpload,
      },
    });

    const remoteApp = express().use(
      graphqlUploadExpress(),
      // Yoga causes leak, so we are removing that for now
      getBasicGraphQLMiddleware(remoteSchema)
    );

    remoteServer = await startServer(remoteApp);
    remotePort = (remoteServer.address() as AddressInfo).port;

    const nonExecutableSchema = buildSchema(/* GraphQL */ `
      scalar Upload
      type Query {
        version: String
      }
      type Mutation {
        upload(file: Upload): String
      }
    `);

    const subschema: SubschemaConfig = {
      schema: nonExecutableSchema,
      executor: linkToExecutor(
        createServerHttpLink({
          uri: `http://localhost:${remotePort.toString()}`,
        })
      ),
    };

    const gatewaySchema = stitchSchemas({
      subschemas: [subschema],
      resolvers: {
        Upload: ServerGraphQLUpload,
      },
    });

    const gatewayApp = express().use(graphqlUploadExpress(), getBasicGraphQLMiddleware(gatewaySchema));

    gatewayServer = await startServer(gatewayApp);
    gatewayPort = (gatewayServer.address() as AddressInfo).port;
  });

  afterAll(async () => {
    remoteServer.close();
    gatewayServer.close();
  });

  test('should return a file after uploading one', async () => {
    const query = /* GraphQL */ `
      mutation upload($file: Upload!) {
        upload(file: $file)
      }
    `;
    const res = await testGraphqlMultipartRequest(query, gatewayPort);

    expect(await res.json()).toEqual({
      data: {
        upload: 'abc',
      },
    });
  });
});
