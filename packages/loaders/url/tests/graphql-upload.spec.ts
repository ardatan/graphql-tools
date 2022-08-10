import { File } from '@whatwg-node/fetch';
import { readFileSync } from 'fs';
import { execute, parse } from 'graphql';
import { join } from 'path';
import { assertNonMaybe, testSchema } from './test-utils';
import processRequest from 'graphql-upload/processRequest.mjs';
import http from 'http';
import { UrlLoader } from '../src';
import { ExecutionResult } from '@graphql-tools/utils';

describe('GraphQL Upload compatibility', () => {
  const loader = new UrlLoader();
  let httpServer: http.Server;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  it('should handle file uploads in graphql-upload way', async () => {
    httpServer = http.createServer((req, res) => {
      let process$;
      if (req.headers['content-type'] === 'application/json') {
        process$ = new Promise((resolve, reject) => {
          let body = '';
          req
            .on('data', chunk => {
              body += chunk;
            })
            .on('end', () => {
              resolve(JSON.parse(body));
            })
            .on('error', reject);
        });
      } else {
        process$ = processRequest(req, res);
      }
      process$
        .then((body: any) => {
          const { query, variables } = body;
          return execute({
            schema: testSchema,
            document: parse(query),
            variableValues: variables,
          });
        })
        .catch((err: Error) => {
          return {
            errors: [
              {
                message: err.message,
              },
            ],
          };
        })
        .then((result: ExecutionResult) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write(JSON.stringify(result));
          res.end();
        });
    });
    await new Promise<void>(resolve => httpServer.listen(9871, resolve));

    const [{ schema }] = await loader.load(`http://0.0.0.0:9871/graphql`, {
      multipart: true,
    });

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

    expect(result.errors).toBeFalsy();
    assertNonMaybe(result.data);
    const uploadFileData: any = result.data?.['uploadFile'];
    expect(uploadFileData?.filename).toBe(fileName);
    expect(uploadFileData?.content).toBe(content);
  });
});
