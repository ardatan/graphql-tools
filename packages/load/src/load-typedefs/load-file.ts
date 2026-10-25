import { env } from 'process';
import { createFailedSource, shouldCollectLoadErrors, Source } from '@graphql-tools/utils';
import { LoadTypedefsOptions } from '../load-typedefs.js';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source[]> {
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
          if (env['DEBUG']) {
            console.error(error);
          }
          if (error instanceof AggregateError) {
            for (const errorElement of error.errors) {
              errors.push(errorElement);
            }
          } else {
            errors.push(error);
          }
        }
      }),
    );

    if (results.length === 0 && errors.length > 0) {
      if (shouldCollectLoadErrors(options.errorHandling)) {
        return errors.map(error => createFailedSource(pointer, error));
      }
      // Always surface the "no type definitions" context, even for a single
      // loader error — otherwise an unrelated parse/pluck failure can hide it (#7406).
      throw new AggregateError(
        errors,
        `Failed to find any GraphQL type definitions in: ${pointer};\n - ${errors
          .map(error => error.message)
          .join('\n  - ')}`,
      );
    }
    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  return results;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source[] {
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
        if (env['DEBUG']) {
          console.error(error);
        }
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
      if (shouldCollectLoadErrors(options.errorHandling)) {
        return errors.map(error => createFailedSource(pointer, error));
      }
      throw new AggregateError(
        errors,
        `Failed to find any GraphQL type definitions in: ${pointer};\n - ${errors
          .map(error => error.message)
          .join('\n  - ')}`,
      );
    }

    if (options.cache) {
      options.cache[pointer] = results;
    }
  }

  return results;
}
