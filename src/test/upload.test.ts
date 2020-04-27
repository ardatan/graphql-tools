import { Server } from 'http';
import { AddressInfo } from 'net';
import { Readable } from 'stream';

import express, { Express } from 'express';
import graphqlHTTP from 'express-graphql';
import { GraphQLUpload, graphqlUploadExpress } from 'graphql-upload';
import FormData from 'form-data';
import { fetch } from 'cross-fetch';
import { buildSchema } from 'graphql';

import { makeExecutableSchema } from '../generate/index';
import { createServerHttpLink } from '../links/index';
import { GraphQLUpload as ServerGraphQLUpload } from '../scalars/index';
import { SubschemaConfig } from '../Interfaces';
import { linkToExecutor } from '../links/linkToExecutor';

function streamToString(stream: Readable) {
  const chunks: Array<Buffer> = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function startServer(e: Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    e.listen(undefined, 'localhost', function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
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
    }),
  );
  body.append('map', '{ "1": ["variables.file"] }');
  body.append('1', 'abc', { filename: __filename });

  return fetch(`http://localhost:${port.toString()}`, {
    method: 'POST',
    body: (body as unknown) as BodyInit,
  });
}

describe('graphql upload', () => {
  test('should return a file after uploading one', async () => {
    const remoteSchema = makeExecutableSchema({
      typeDefs: `
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
      graphqlHTTP({ schema: remoteSchema }),
    );

    const remoteServer = await startServer(remoteApp);
    const remotePort = (remoteServer.address() as AddressInfo).port;

    const nonExecutableSchema = buildSchema(`
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
        }),
      ),
    };

    const gatewaySchema = makeExecutableSchema({
      subschemas: [subschema],
      resolvers: {
        Upload: ServerGraphQLUpload,
      },
    });

    const gatewayApp = express().use(
      graphqlUploadExpress(),
      graphqlHTTP({ schema: gatewaySchema }),
    );

    const gatewayServer = await startServer(gatewayApp);
    const gatewayPort = (gatewayServer.address() as AddressInfo).port;
    const query = `
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

    remoteServer.close();
    gatewayServer.close();
  });
});
