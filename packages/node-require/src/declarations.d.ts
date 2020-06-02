/* eslint-disable import/no-duplicates */
declare module '*.graphql' {
  import { DocumentNode } from 'graphql';

  const value: DocumentNode;
  export = value;
}

declare module '*.gql' {
  import { DocumentNode } from 'graphql';

  const value: DocumentNode;
  export = value;
}

declare module '*.gqls' {
  import { DocumentNode } from 'graphql';

  const value: DocumentNode;
  export = value;
}

declare module '*.graphqls' {
  import { DocumentNode } from 'graphql';

  const value: DocumentNode;
  export = value;
}
