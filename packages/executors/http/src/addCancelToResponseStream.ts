import { withCancel } from '@graphql-tools/utils';

export function cancelNeeded() {
  if (globalThis.process?.versions?.node) {
    const [nodeMajorStr, nodeMinorStr] = process.versions.node.split('.');

    const nodeMajor = parseInt(nodeMajorStr);
    const nodeMinor = parseInt(nodeMinorStr);

    if (nodeMajor > 16 || (nodeMajor === 16 && nodeMinor >= 5)) {
      return false;
    }
    return true;
  }

  return false;
}

export function addCancelToResponseStream<T>(resultStream: AsyncIterable<T>, controller: AbortController) {
  return withCancel(resultStream, () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  });
}
