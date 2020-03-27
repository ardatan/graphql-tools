import {
  versionInfo,
  getOperationRootType,
  lexicographicSortSchema,
  printError,
} from 'graphql';

let version: number;

if (versionInfo != null && versionInfo.major >= 15) {
  version = 15;
} else if (getOperationRootType != null) {
  version = 14;
} else if (lexicographicSortSchema != null) {
  version = 13;
} else if (printError != null) {
  version = 12;
} else {
  version = 11;
}

export function graphqlVersion() {
  return version;
}
