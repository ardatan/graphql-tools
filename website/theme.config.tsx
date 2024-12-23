/* eslint sort-keys: error */
import { useRouter } from 'next/router';
import { defineConfig, Giscus, PRODUCTS, useTheme } from '@theguild/components';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/ardatan/graphql-tools/tree/master/website',
  main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();

    const comments = route !== '/' && (
      <Giscus
        // ensure giscus is reloaded when client side route is changed
        key={route}
        repo="ardatan/graphql-tools"
        repoId="MDEwOlJlcG9zaXRvcnk1NDQzMjE2OA=="
        category="Docs Discussions"
        categoryId="DIC_kwDOAz6RqM4CSDSV"
        mapping="pathname"
        theme={resolvedTheme}
      />
    );
    return (
      <>
        {children}
        {comments}
      </>
    );
  },
  websiteName: 'GraphQL-Tools',
  description: PRODUCTS.TOOLS.title,
  // @ts-expect-error - Typings are not updated
  logo: PRODUCTS.TOOLS.logo({ className: 'w-9' }),
});
