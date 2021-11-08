/* eslint-disable */
import { resolve } from 'path';
import { existsSync } from 'fs';
import { cwd } from 'process';
import { jest } from '@jest/globals';

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
