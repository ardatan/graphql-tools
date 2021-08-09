import { Source, isDocumentString, parseGraphQLSDL, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { isSchema, Kind } from 'graphql';
import { LoadTypedefsOptions } from '../load-typedefs';
import { loadFile, loadFileSync } from './load-file';
import { stringToHash, useStack, StackNext, StackFn } from '../utils/helpers';
import { useCustomLoader, useCustomLoaderSync } from '../utils/custom-loader';
import { useQueue, useSyncQueue } from '../utils/queue';

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
    options,
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
    options,
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
  options,
  stack,
}: {
  sources: Source[];
  options: LoadTypedefsOptions<Partial<T>>;
  stack: StackFn<CollectOptions<T>>[];
}) {
  const addSource: AddSource = ({
    pointer,
    source,
    noCache,
  }: {
    pointer: string;
    source: Source;
    noCache?: boolean;
  }) => {
    sources.push(source);

    if (!noCache && options.cache) {
      options.cache[pointer] = options.cache[pointer] || [];
      options.cache[pointer].push(source);
    }
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

function collectDocumentString<T>(
  { pointer, pointerOptions, options, addSource, queue }: CollectOptions<T>,
  next: StackNext
) {
  if (isDocumentString(pointer)) {
    return queue(() => {
      const source = parseGraphQLSDL(`${stringToHash(pointer)}.graphql`, pointer, {
        ...options,
        ...pointerOptions,
      });

      addSource({
        source,
        pointer,
      });
    });
  }

  next();
}

function collectCustomLoader<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext
) {
  if (pointerOptions.loader) {
    return queue(async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
      const loader = await useCustomLoader(pointerOptions.loader, options.cwd);
      const result = await loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

      if (!result) {
        return;
      }

      addResultOfCustomLoader({ pointer, result, addSource });
    });
  }

  next();
}

function collectCustomLoaderSync<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext
) {
  if (pointerOptions.loader) {
    return queue(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
      const loader = useCustomLoaderSync(pointerOptions.loader, options.cwd);
      const result = loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

      if (result) {
        addResultOfCustomLoader({ pointer, result, addSource });
      }
    });
  }

  next();
}

function collectFallback<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
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

function collectFallbackSync<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
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
