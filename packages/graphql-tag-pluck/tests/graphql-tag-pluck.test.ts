import { gqlPluckFromCodeString, gqlPluckFromCodeStringSync } from '../src';
import { freeText } from '../src/utils';
import { runTests } from '../../testing/utils';

describe('graphql-tag-pluck', () => {
  runTests({
    async: gqlPluckFromCodeString,
    sync: gqlPluckFromCodeStringSync
  })(pluck => {
    it('should pluck graphql-tag template literals from .js file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import gql from 'graphql-tag'
  
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .js file and remove replacements', async () => {  
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import gql from 'graphql-tag'
  
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
        const fragment2 = gql(\`
          fragment Foo2 on FooType {
            name
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
              ...Foo2
            }
          }
  
          \${fragment}
          \${fragment2}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        fragment Foo2 on FooType {
          name
        }
  
        query foo {
          foo {
            ...Foo
            ...Foo2
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .ts file', async () => {  
      const gqlString = await pluck('tmp-XXXXXX.ts', freeText(`
        import gql from 'graphql-tag'
        import { Document } from 'graphql'
  
        export namespace Fragments {
          interface EmptyObject {}
  
          const object = <EmptyObject> {}
  
          const fragment: Document = gql\`
            fragment Foo on FooType {
              id
            }
          \`
  
          const doc: Document = gql\`
            query foo {
              foo {
                ...Foo
              }
            }
  
            \${fragment}
          \`
        }
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .tsx file', async () => {  
      const gqlString = await pluck('tmp-XXXXXX.tsx', freeText(`
        import * as React from 'react';
        import gql from 'graphql-tag';
  
        export default class extends React.Component<{}, {}> {
          public render() {
            return <div />;
          }
        }
  
        export const pageQuery = gql\`
          query IndexQuery {
            site {
              siteMetadata {
                title
              }
            }
          }
        \`;
  
        // export const pageQuery = gql\`
        //   query IndexQuery {
        //     site {
        //       siteMetadata {
        //         title
        //       }
        //     }
        //   }
        // \`;
      `));
  
      expect(gqlString).toEqual(freeText(`
        query IndexQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .vue JavaScript file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.vue', freeText(`
        <template>
          <div>test</div>
        </template>
  
        <script>
        import Vue from 'vue'
        import gql from 'graphql-tag';
  
        export default Vue.extend({
          name: 'TestComponent'
        })
  
        export const pageQuery = gql\`
          query IndexQuery {
            site {
              siteMetadata {
                title
              }
            }
          }
        \`;
  
        // export const pageQuery = gql\`
        //   query OtherQuery {
        //     site {
        //       siteMetadata {
        //         title
        //       }
        //     }
        //   }
        // \`;
        </script>
  
        <style>
        .test { color: red };
        </style>
      `));
  
      expect(gqlString).toEqual(freeText(`
        query IndexQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .vue TS/Pug/SCSS file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.vue', freeText(`
        <template lang="pug">
          <div>test</div>
        </template>
  
        <script lang="ts">
        import Vue from 'vue'
        import gql from 'graphql-tag';
  
        export default Vue.extend({
          name: 'TestComponent'
        })
  
        export const pageQuery = gql\`
          query IndexQuery {
            site {
              siteMetadata {
                title
              }
            }
          }
        \`;
  
        // export const pageQuery = gql\`
        //   query OtherQuery {
        //     site {
        //       siteMetadata {
        //         title
        //       }
        //     }
        //   }
        // \`;
        </script>
  
        <style lang="scss">
        .test { color: red };
        </style>
      `));
  
      expect(gqlString).toEqual(freeText(`
        query IndexQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .tsx file with generic jsx elements', async () => {
      const gqlString = await pluck('tmp-XXXXXX.tsx', freeText(`
        import * as React from 'react';
        import gql from 'graphql-tag';
        import Generic from './Generic'
  
        export default class extends React.Component<{}, {}> {
          public render() {
            return (
              <div>
                <Generic<string, number> />
                <Generic<undefined> />
                <Generic<null> />
              </div>
            )
          }
        }
  
        export const pageQuery = gql\`
          query IndexQuery {
            site {
              siteMetadata {
                title
              }
            }
          }
        \`;
      `));
  
      expect(gqlString).toEqual(freeText(`
        query IndexQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .ts file with the same const inside namespace and outside namespace', async () => {
      const gqlString = await pluck('tmp-XXXXXX.ts', freeText(`
        import gql from 'graphql-tag';
  
        namespace Foo {
          export const foo = 12;
  
          export const query = gql\`
            query myQueryInNamespace {
              fieldA
            }
          \`;
        }
  
        interface ModuleWithProviders {
          ngModule: string;
        }
  
        export class FooModule {
          static forRoot() {
            return <ModuleWithProviders>{
              ngModule: 'foo',
              value: Foo.foo
            };
          }
        }
  
        export const query = gql\`
          query myQuery {
            fieldA
          }
        \`;
      `));
  
      expect(gqlString).toEqual(freeText(`
        query myQueryInNamespace {
          fieldA
        }
  
        query myQuery {
          fieldA
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .flow file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.flow', freeText(`
        import gql from 'graphql-tag'
        import { Document } from 'graphql'
  
        const fragment: Document = gql\`
          fragment Foo on FooType {
            id
          }
        \`
  
        const doc: Document = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .js file with @flow header', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        // @flow
  
        import gql from 'graphql-tag'
        import { Document } from 'graphql'
  
        const fragment: Document = gql\`
          fragment Foo on FooType {
            id
          }
        \`
  
        const doc: Document = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });

    it('should pluck graphql-tag template literals from .js file with @flow strict-local', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        // @flow strict-local
  
        import gql from 'graphql-tag'
        import { Document } from 'graphql'
  
        const fragment: Document = gql\`
          fragment Foo on FooType {
            id
          }
        \`
  
        const doc: Document = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should NOT pluck graphql-tag template literals from .js file without a @flow header', async () => {  
      const fail = Error('Function did not throw');
  
      try {
        await pluck('tmp-XXXXXX.js', freeText(`
          import gql from 'graphql-tag'
          import { Document } from 'graphql'
    
          const fragment: Document = gql\`
            fragment Foo on FooType {
              id
            }
          \`
    
          const doc: Document = gql\`
            query foo {
              foo {
                ...Foo
              }
            }
    
            \${fragment}
          \`
        `));
  
        throw fail;
      }
      catch (e) {
        expect(e).not.toEqual(fail);
      }
    });
  
    it('should pluck graphql-tag template literals from .flow.jsx file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.flow.jsx', freeText(`
        import gql from 'graphql-tag'
        import { Document } from 'graphql'
  
        const fragment: Document = gql\`
          fragment Foo on FooType {
            id
          }
        \`
  
        const doc: Document = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from .*.jsx file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.mutation.jsx', freeText(`
        import gql from 'graphql-tag'
  
        const fragment = gql\`
          fragment Foo on FooType {
            id
          }
        \`
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals leaded by a magic comment from .js file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        const Message = /* GraphQL */ \`
          enum MessageTypes {
            text
            media
            draftjs
          }\`
      `));
  
      expect(gqlString).toEqual(freeText(`
        enum MessageTypes {
          text
          media
          draftjs
        }
      `));
    });
  
    it('should pluck graphql-tag expression statements leaded by a magic comment from .js file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        /* GraphQL */ \`
          enum MessageTypes {
            text
            media
            draftjs
          }\`
      `));
  
      expect(gqlString).toEqual(freeText(`
        enum MessageTypes {
          text
          media
          draftjs
        }
      `));
    });
  
    it(`should NOT pluck other template literals from a .js file`, async () => {
      const gqlString = await pluck(`tmp-XXXXXX.js`, freeText(`
        test(
          \`test1\`
        )
        test.test(
          \`test2\`
        )
        test\`
          test3
        \`
        test.test\`
          test4
        \`
      `));
  
      expect(gqlString).toEqual('');
    });
  
    it('should pluck template literals when graphql-tag is imported differently', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import graphqltag from 'graphql-tag'
  
        const fragment = graphqltag(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = graphqltag\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck template literals from gql by default even if not imported from graphql-tag', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from code string', async () => {
      const gqlString = await pluck('test.js', freeText(`
        import gql from 'graphql-tag'
  
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql-tag template literals from a .js file', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import gql from 'graphql-tag'
  
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should be able to specify the global GraphQL identifier name', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        const fragment = anothergql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = anothergql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `), {
        globalGqlIdentifierName: 'anothergql'
      });
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should be able to specify the GraphQL magic comment to look for', async () => {  
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        const Message = /* GQL */ \`
          enum MessageTypes {
            text
            media
            draftjs
          }\`
      `), {
        gqlMagicComment: 'GQL'
      });
  
      expect(gqlString).toEqual(freeText(`
        enum MessageTypes {
          text
          media
          draftjs
        }
      `));
    });
  
    it('should be able to specify the package name of which the GraphQL identifier should be imported from', async () => {  
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import mygql from 'my-graphql-tag'
  
        const fragment = mygql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = mygql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `), {
        modules: [
          { name: 'my-graphql-tag' }
        ]
      });
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck graphql template literal from gatsby package', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import {graphql} from 'gatsby'
  
        const fragment = graphql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = graphql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck gql template literal from apollo-server-express package', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import { gql } from 'apollo-server-express'
  
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck gql template literal from @apollo/client package', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        import { gql } from '@apollo/client'
  
        const fragment = gql(\`
          fragment Foo on FooType {
            id
          }
        \`)
  
        const doc = gql\`
          query foo {
            foo {
              ...Foo
            }
          }
  
          \${fragment}
        \`
      `));
  
      expect(gqlString).toEqual(freeText(`
        fragment Foo on FooType {
          id
        }
  
        query foo {
          foo {
            ...Foo
          }
        }
      `));
    });
  
    it('should pluck magic comment template literals with a trailing semicolon', async () => {
      const gqlString = await pluck('test.js', '/* GraphQL */ `{}`;');
      expect(gqlString).toEqual('{}');
    });
  
    it('should pluck with comments having escaped backticks', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
      import gql from 'graphql-tag';
  
      export default gql\`
        type User {
          id: ID!
          "Choose a nice username, so users can \\\`@mention\\\` you."
          username: String!
          email: String!
        }
      \`
      `));
  
      expect(gqlString).toEqual(freeText(`
          type User {
            id: ID!
            "Choose a nice username, so users can \`@mention\` you."
            username: String!
            email: String!
          }
      `));
    });
  
    it('should pluck graphql template literal imported lazily', async () => {
      const gqlString = await pluck('tmp-XXXXXX.js', freeText(`
        async function getUserType() {
          const graphql = await import('graphql-tag');
      
          return graphql\`
            type User {
              id: ID!
              "Choose a nice username, so users can \\\`@mention\\\` you."
              username: String!
              email: String!
            }
          \`
        }
      `));
  
      expect(gqlString).toEqual(freeText(`
          type User {
            id: ID!
            "Choose a nice username, so users can \`@mention\` you."
            username: String!
            email: String!
          }
      `));
    });

    it('should pluck graphql template literal in a code file that has decorators', async () => {
      const gqlString = await pluck('tmp-XXXXXX.ts', freeText(`
        const CurrentUserForProfile = gql\`
          query CurrentUserForProfile {
            currentUser {
              login
              avatar_url
            }
          }
        \`;
        
        @Component({
          selector: 'app-dialog',
          template: 'test',
        })
        export class DialogComponent implements OnInit {
          constructor(
            public apollo: Apollo,
            @Inject(MAT_DIALOG_DATA) public data: any
          ) {}
        
          ngOnInit(): void {
            this.apollo
              .watchQuery<any>({
                query: CurrentUserForProfile,
              })
              .valueChanges.subscribe();
          }
        }
      `));

  
      expect(gqlString).toEqual(freeText(/* GraphQL */`
        query CurrentUserForProfile {
          currentUser {
            login
            avatar_url
          }
        }
      `));

    })
  });
});
