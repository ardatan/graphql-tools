import { stripIgnoredCharacters } from 'graphql';

export function prepareGETUrl({
  baseUrl = '',
  query,
  variables,
  operationName,
  extensions,
}: {
  baseUrl: string;
  query: string;
  variables?: any;
  operationName?: string;
  extensions?: any;
}) {
  const dummyHostname = 'https://dummyhostname.com';
  const validUrl = baseUrl.startsWith('http')
    ? baseUrl
    : baseUrl?.startsWith('/')
    ? `${dummyHostname}${baseUrl}`
    : `${dummyHostname}/${baseUrl}`;
  const urlObj = new URL(validUrl);
  urlObj.searchParams.set('query', stripIgnoredCharacters(query));
  if (variables && Object.keys(variables).length > 0) {
    urlObj.searchParams.set('variables', JSON.stringify(variables));
  }
  if (operationName) {
    urlObj.searchParams.set('operationName', operationName);
  }
  if (extensions) {
    urlObj.searchParams.set('extensions', JSON.stringify(extensions));
  }
  const finalUrl = urlObj.toString().replace(dummyHostname, '');
  return finalUrl;
}
