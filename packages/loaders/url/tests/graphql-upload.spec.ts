import { File } from '@whatwg-node/fetch';
import { readFileSync } from 'fs';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { GraphQLSchema, parse } from 'graphql';
import { join } from 'path';
import { assertNonMaybe, testSchema } from './test-utils';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import http from 'http';
import { UrlLoader } from '../src';
import express from 'express';

function getBasicGraphQLMiddleware(schema: GraphQLSchema) {
  return (req: any, res: any) => {
    Promise.resolve()
      .then(async () => {
        const { query, variables, operationName } = req.body;
        const result = await execute({
          schema,
          document: parse(query),
          variableValues: variables,
          operationName,
        });
        res.json(result);
      })
      .catch(err => {
        res.status(500).json({
          errors: [
            {
              message: err.message,
            },
          ],
        });
      });
  };
}

describe('GraphQL Upload compatibility', () => {
  const loader = new UrlLoader();
  let httpServer: http.Server;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await new Promise<void>((resolve, reject) =>
        httpServer.close(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        })
      );
    }
  });

  it('should handle file uploads in graphql-upload way', async () => {
    const expressApp = express().use(express.json(), graphqlUploadExpress(), getBasicGraphQLMiddleware(testSchema));

    httpServer = await new Promise<http.Server>(resolve => {
      const server = expressApp.listen(9871, () => {
        resolve(server);
      });
    });

    const [{ schema }] = await loader.load(`http://0.0.0.0:9871/graphql`, {});

    const fileName = 'testfile.txt';

    const absoluteFilePath = join(__dirname, fileName);

    const content = readFileSync(absoluteFilePath, 'utf8');
    assertNonMaybe(schema);
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation UploadFile($file: Upload!, $nullVar: TestInput, $nonObjectVar: String) {
          uploadFile(file: $file, dummyVar: $nullVar, secondDummyVar: $nonObjectVar) {
            filename
            content
          }
        }
      `),
      variableValues: {
        file: new File([content], fileName, { type: 'text/plain' }),
        nullVar: null,
        nonObjectVar: 'somefilename.txt',
      },
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.errors).toBeFalsy();
    assertNonMaybe(result.data);
    const uploadFileData: any = result.data?.['uploadFile'];
    expect(uploadFileData?.filename).toBe(fileName);
    expect(uploadFileData?.content).toBe(content);
  });
});
