import { createRequire } from 'module';
import { cwd } from 'process';
import { isSchema, Kind } from 'graphql';
import {
  asArray,
  createFailedSource,
  getDocumentNodeFromSchema,
  isDocumentString,
  parseGraphQLSDL,
  shouldCollectLoadErrors,
  Source,
} from '@graphql-tools/utils';
import { LoadTypedefsOptions } from '../load-typedefs.js';
import { useCustomLoader, useCustomLoaderSync } from '../utils/custom-loader.js';
import { StackFn, StackNext, stringToHash, useStack } from '../utils/helpers.js';
import { useQueue, useSyncQueue } from '../utils/queue.js';
import { loadFile, loadFileSync } from './load-file.js';

type AddSource = (data: { pointer: string; source: Source; noCache?: boolean }) => void;
type AddToQueue<T> = (fn: () => Promise<T> | T) => void;

const CONCURRENCY_LIMIT = 50;

export async function collectSources<TOptions>({
  pointerOptionMap,
  options,
}: {
  pointerOptionMap: {
    [key: string]: any;
  };
  options: LoadTypedefsOptions<Partial<TOptions>>;
}): Promise<Source[]> {
  const sources: Source[] = [];
  const queue = useQueue<void>({ concurrency: CONCURRENCY_LIMIT });

  const { addSource, collect } = createHelpers({
    sources,
    stack: [collectDocumentString, collectCustomLoader, collectFallback],
  });

  for (const pointer in pointerOptionMap) {
    const pointerOptions = pointerOptionMap[pointer];

    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      queue: queue.add as AddToQueue<void>,
    });
  }

  await queue.runAll();
  return sources;
}

export function collectSourcesSync<TOptions>({
  pointerOptionMap,
  options,
}: {
  pointerOptionMap: {
    [key: string]: any;
  };
  options: LoadTypedefsOptions<Partial<TOptions>>;
}): Source[] {
  const sources: Source[] = [];
  const queue = useSyncQueue<void>();

  const { addSource, collect } = createHelpers({
    sources,
    stack: [collectDocumentString, collectCustomLoaderSync, collectFallbackSync],
  });

  for (const pointer in pointerOptionMap) {
    const pointerOptions = pointerOptionMap[pointer];

    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      queue: queue.add,
    });
  }

  queue.runAll();

  return sources;
}

function createHelpers<T>({
  sources,
  stack,
}: {
  sources: Source[];
  stack: StackFn<CollectOptions<T>>[];
}) {
  const addSource: AddSource = ({ source }: { pointer: string; source: Source }) => {
    sources.push(source);
  };

  const collect = useStack(...stack);

  return {
    addSource,
    collect,
  };
}

type CollectOptions<T> = {
  pointer: string;
  pointerOptions: any;
  options: LoadTypedefsOptions<Partial<T>>;
  pointerOptionMap: Record<string, any>;
  addSource: AddSource;
  queue: AddToQueue<void>;
};

function addResultOfCustomLoader({
  pointer,
  result,
  addSource,
}: {
  pointer: string;
  result: any;
  addSource: AddSource;
}) {
  if (isSchema(result)) {
    addSource({
      source: {
        location: pointer,
        schema: result,
        document: getDocumentNodeFromSchema(result),
      },
      pointer,
      noCache: true,
    });
  } else if (result.kind && result.kind === Kind.DOCUMENT) {
    addSource({
      source: {
        document: result,
        location: pointer,
      },
      pointer,
    });
  } else if (result.document) {
    addSource({
      source: {
        location: pointer,
        ...result,
      },
      pointer,
    });
  }
}

function errorHandlingOf(
  options: { errorHandling?: unknown },
  pointerOptions: { errorHandling?: unknown },
) {
  return pointerOptions.errorHandling ?? options.errorHandling;
}

function isIncompleteDocumentString(pointer: string): boolean {
  return (
    !/\.[a-z0-9]+$/i.test(pointer) &&
    /(?:^|\s)(query|mutation|subscription|fragment)\b/.test(pointer) &&
    pointer.includes('{')
  );
}

function collectDocumentString<T>(
  { pointer, pointerOptions, options, addSource, queue }: CollectOptions<T>,
  next: StackNext,
) {
  const errorHandling = errorHandlingOf(options, pointerOptions);
  let isInlineDocument = false;
  try {
    isInlineDocument = isDocumentString(pointer);
  } catch (error) {
    if (shouldCollectLoadErrors(errorHandling)) {
      return queue(() => {
        addSource({
          source: createFailedSource(`${stringToHash(pointer)}.graphql`, error),
          pointer,
        });
      });
    }
    throw error;
  }

  if (isInlineDocument || isIncompleteDocumentString(pointer)) {
    return queue(() => {
      try {
        const source = parseGraphQLSDL(`${stringToHash(pointer)}.graphql`, pointer, {
          ...options,
          ...pointerOptions,
        });

        addSource({
          source,
          pointer,
        });
      } catch (error) {
        if (shouldCollectLoadErrors(errorHandling)) {
          addSource({
            source: createFailedSource(`${stringToHash(pointer)}.graphql`, error),
            pointer,
          });
          return;
        }
        throw error;
      }
    });
  }

  next();
}

function collectCustomLoader<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext,
) {
  if (pointerOptions.loader) {
    return queue(async () => {
      try {
        await Promise.all(asArray(pointerOptions.require).map(m => import(m)));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
        const loader = await useCustomLoader(pointerOptions.loader, options.cwd);
        const result = await loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

        if (!result) {
          return;
        }

        for (const item of asArray(result)) {
          if (item == null) {
            continue;
          }
          addResultOfCustomLoader({ pointer, result: item, addSource });
        }
      } catch (error) {
        if (shouldCollectLoadErrors(errorHandlingOf(options, pointerOptions))) {
          addSource({
            source: createFailedSource(pointer, error),
            pointer,
          });
          return;
        }
        throw error;
      }
    });
  }

  next();
}

function collectCustomLoaderSync<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext,
) {
  if (pointerOptions.loader) {
    return queue(() => {
      try {
        const cwdRequire = createRequire(options.cwd || cwd());
        for (const m of asArray(pointerOptions.require)) {
          cwdRequire(m);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
        const loader = useCustomLoaderSync(pointerOptions.loader, options.cwd);
        const result = loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

        if (result) {
          for (const item of asArray(result)) {
            if (item == null) {
              continue;
            }
            addResultOfCustomLoader({ pointer, result: item, addSource });
          }
        }
      } catch (error) {
        if (shouldCollectLoadErrors(errorHandlingOf(options, pointerOptions))) {
          addSource({
            source: createFailedSource(pointer, error),
            pointer,
          });
          return;
        }
        throw error;
      }
    });
  }

  next();
}

function collectFallback<T>({
  queue,
  pointer,
  options,
  pointerOptions,
  addSource,
}: CollectOptions<T>) {
  return queue(async () => {
    const sources = await loadFile(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (sources) {
      for (const source of sources) {
        addSource({ source, pointer });
      }
    }
  });
}

function collectFallbackSync<T>({
  queue,
  pointer,
  options,
  pointerOptions,
  addSource,
}: CollectOptions<T>) {
  return queue(() => {
    const sources = loadFileSync(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (sources) {
      for (const source of sources) {
        addSource({ source, pointer });
      }
    }
  });
}
