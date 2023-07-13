import { withCancel } from '@graphql-tools/utils';

export function addCancelToResponseStream<T>(
  resultStream: AsyncIterable<T>,
  controller: AbortController,
) {
  return withCancel(resultStream, () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  });
}
