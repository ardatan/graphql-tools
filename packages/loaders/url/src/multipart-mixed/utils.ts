/* eslint-disable */

export function getBoundaryFromContentType(contentType: string) {
  const idxBoundary = contentType.indexOf('boundary=');
  return `--${
    !!~idxBoundary
      ? // +9 for 'boundary='.length
        contentType
          .substring(idxBoundary + 9)
          .trim()
          .replace(/['"]/g, '')
      : '-'
  }`;
}

export const separator = '\r\n\r\n';

export const decoder = new TextDecoder();
