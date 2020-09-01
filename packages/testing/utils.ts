/* eslint-disable */
import { GraphQLSchema, execute, parse } from 'graphql';
import { resolve } from 'path';
import { existsSync } from 'fs';
import nock from 'nock';
import { cwd } from 'process';

export function normalizeString(str: string) {
  return str.replace(/[\s,]+/g, ' ').trim();
}

type PromiseOf<T extends (...args: any[]) => any> = T extends (...args: any[]) => Promise<infer R> ? R : ReturnType<T>;

export function runTests<
  TSync extends (...args: any[]) => TResult,
  TAsync extends (...args: any[]) => Promise<TResult>,
  TResult = ReturnType<TSync>
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
        testRunner((...args: Parameters<TSync>) => {
          return new Promise<PromiseOf<TAsync>>((resolve, reject) => {
            try {
              const result: any = executeSync(...args);
              resolve(result);
            } catch (error) {
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
      let spyProcessCwd: jest.SpyInstance;
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
    } catch (e) {
      // ignore
    }
  }

  throw new Error(`Coudn't find project's root from: ${originalDirname}`);
}

export function mockGraphQLServer({
  schema,
  host,
  path,
  intercept,
  method = 'POST',
}: {
  schema: GraphQLSchema;
  host: string;
  path: string | RegExp | ((path: string) => boolean);
  intercept?: (obj: nock.ReplyFnContext) => void;
  method?: string;
}) {
  switch (method) {
    case 'GET':
      return nock(host)
        .get(path)
        .reply(async function (uri) {
          const urlObj = new URL(host + uri);
          try {
            if (intercept) {
              intercept(this);
            }
            const result = await execute({
              schema,
              document: parse(urlObj.searchParams.get('query')),
              operationName: urlObj.searchParams.get('operationName'),
              variableValues: JSON.parse(urlObj.searchParams.get('variables') || '{}'),
            });
            return [200, result];
          } catch (error) {
            return [500, error];
          }
        });
    case 'POST':
      return nock(host)
        .post(path)
        .reply(async function (_: string, body: any) {
          try {
            if (intercept) {
              intercept(this);
            }
            const result = await execute({
              schema,
              document: parse(body.query),
              operationName: body.operationName,
              variableValues: body.variables,
            });
            return [200, result];
          } catch (error) {
            return [500, error];
          }
        });
  }
}
