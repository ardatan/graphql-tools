/* eslint-disable */
import { GraphQLSchema, execute, subscribe } from 'graphql';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { cwd } from 'process';
import express from 'express';
import { getGraphQLParameters, processRequest, sendResult } from 'graphql-helix';
import { jest } from '@jest/globals';
import { IncomingMessage, Server } from 'http';
import { graphqlUploadExpress } from 'graphql-upload';
import bodyParser from 'body-parser';

export function normalizeString(str: string) {
  return str.replace(/[\s,]+/g, ' ').trim();
}

type PromiseOf<T extends (...args: any[]) => any> = T extends (...args: any[]) => Promise<infer R> ? R : ReturnType<T>;

export function runTests<
  TResult extends any,
  TArgs extends Array<any>,
  TSync extends (...args: TArgs) => TResult,
  TAsync extends (...args: TArgs) => Promise<TResult>
>({ sync: executeSync, async: executeAsync }: { sync?: TSync; async?: TAsync }) {
  return (
    testRunner: (
      executeFn: (...args: Parameters<TSync | TAsync>) => Promise<PromiseOf<TSync | TAsync>>,
      mode: 'sync' | 'async'
    ) => void
  ) => {
    if (executeSync) {
      // sync
      describe('sync', () => {
        testRunner((...args: Parameters<TSync | TAsync>) => {
          return new Promise<PromiseOf<TAsync>>((resolve, reject) => {
            try {
              const result: any = executeSync(...args);
              resolve(result);
            } catch (error: any) {
              reject(error);
            }
          });
        }, 'sync');
      });
    }

    if (executeAsync) {
      // async
      describe(`async`, () => {
        testRunner((...args) => executeAsync(...args) as any, 'async');
      });
    }
  };
}

export function useMonorepo({ dirname }: { dirname: string }) {
  const cwd = findProjectDir(dirname);

  return {
    correctCWD() {
      let spyProcessCwd: any;
      beforeEach(() => {
        spyProcessCwd = jest.spyOn(process, 'cwd').mockReturnValue(cwd);
      });
      afterEach(() => {
        spyProcessCwd.mockRestore();
      });
    },
  };
}

function findProjectDir(dirname: string): string | never {
  const originalDirname = dirname;
  const stopDir = resolve(cwd(), '..');

  while (dirname !== stopDir) {
    try {
      if (existsSync(resolve(dirname, 'package.json'))) {
        return dirname;
      }

      dirname = resolve(dirname, '..');
    } catch (e: any) {
      // ignore
    }
  }

  throw new Error(`Couldn't find project's root from: ${originalDirname}`);
}

export function mockGraphQLServer({
  schema,
  port,
  path,
  method = 'post',
  hostname,
  onRequest = () => {},
}: {
  schema: GraphQLSchema;
  port: number;
  path: string;
  method?: 'get' | 'post';
  hostname: string;
  onRequest?: (request: IncomingMessage) => void;
}) {
  const app = express();
  app[method](
    path,
    bodyParser.json(),
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
    async (request, response) => {
      onRequest(request);
      const parameters = getGraphQLParameters(request);
      const processedRequest = await processRequest({
        ...parameters,
        schema,
        request,
        execute: (schema, document, rootValue, contextValue, variableValues, operationName, fieldResolver) =>
          execute({
            schema,
            document,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver,
          }),
        subscribe: (schema, document, rootValue, contextValue, variableValues, operationName, fieldResolver) =>
          subscribe({
            schema,
            document,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver,
          }),
      });
      sendResult(processedRequest, response);
    }
  );
  return new Promise<Server>((resolve, reject) => {
    try {
      const httpServer = app.listen(port, hostname, () => {
        resolve(httpServer);
      });
    } catch (e) {
      reject(e);
    }
  });
}
