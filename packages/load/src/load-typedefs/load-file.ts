import { Source, AggregateError } from '@graphql-tools/utils';
import { LoadTypedefsOptions } from '../load-typedefs.js';
import { logError, time, timeEnd } from '../utils/debug.js';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source[]> {
  time(`loadFile ${pointer}`);
  let results = options.cache?.[pointer];

  if (!results) {
    results = [];
    const errors: Error[] = [];
    await Promise.all(
      options.loaders.map(async loader => {
        try {
          const loaderResults = await loader.load(pointer, options);
          loaderResults?.forEach(result => results!.push(result));
        } catch (error: any) {
          logError(error);
          if (error instanceof AggregateError) {
            for (const errorElement of error.errors) {
              errors.push(errorElement);
            }
          } else {
            errors.push(error);
          }
        }
      })
    );

    if (results.length === 0 && errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Failed to find any GraphQL type definitions in: ${pointer};\n - ${errors
          .map(error => error.message)
          .join('\n  - ')}`
      );
    }
    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  timeEnd(`loadFile ${pointer}`);

  return results;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source[] {
  time(`loadFileSync ${pointer}`);
  let results = options.cache?.[pointer];

  if (!results) {
    results = [];
    const errors: Error[] = [];
    for (const loader of options.loaders) {
      try {
        // We check for the existence so it is okay to force non null
        const loaderResults = loader.loadSync!(pointer, options);
        loaderResults?.forEach(result => results!.push(result));
      } catch (error: any) {
        error(error);
        if (error instanceof AggregateError) {
          for (const errorElement of error.errors) {
            errors.push(errorElement);
          }
        } else {
          errors.push(error);
        }
      }
    }

    if (results.length === 0 && errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      }
      throw new AggregateError(
        errors,
        `Failed to find any GraphQL type definitions in: ${pointer};\n - ${errors
          .map(error => error.message)
          .join('\n  - ')}`
      );
    }

    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  timeEnd(`loadFileSync ${pointer}`);

  return results;
}
