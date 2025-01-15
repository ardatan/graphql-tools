import { FC, ReactNode } from 'react';
import { GitHubIcon, PaperIcon, PencilIcon, PRODUCTS } from '@theguild/components';
import { getDefaultMetadata, getPageMap, GuildLayout } from '@theguild/components/server';
import '@theguild/components/style.css';
import { pageMap as changelogsPageMap } from './changelogs/[...slug]/page';

const description = PRODUCTS.YOGA.title;
const websiteName = 'Yoga';

export const metadata = getDefaultMetadata({
  description,
  websiteName,
  productName: 'YOGA',
});

const RootLayout: FC<{
  children: ReactNode;
}> = async ({ children }) => {
  let [meta, ...pageMap] = await getPageMap();
  pageMap = [
    {
      data: {
        ...meta.data,
        changelogs: { type: 'page', title: 'Changelogs', theme: { layout: 'full' } },
      },
    },
    ...pageMap,
    { route: '/changelogs', name: 'changelogs', children: changelogsPageMap },
  ];
  return (
    <GuildLayout
      websiteName={websiteName}
      description={description}
      logo={<PRODUCTS.YOGA.logo className="w-8 h-auto" />}
      layoutProps={{
        docsRepositoryBase: 'https://github.com/dotansimha/graphql-yoga/tree/main/website',
      }}
      pageMap={pageMap}
      navbarProps={{
        navLinks: [{ href: '/#', children: '#' }],
        developerMenu: [
          {
            href: '/docs',
            icon: <PaperIcon />,
            children: 'Documentation',
          },
          { href: 'https://the-guild.dev/blog', icon: <PencilIcon />, children: 'Blog' },
          {
            href: 'https://github.com/dotansimha/graphql-yoga',
            icon: <GitHubIcon />,
            children: 'GitHub',
          },
          {
            href: '/changelog',
            icon: null,
            children: 'Changelog',
          },
        ],
      }}
      lightOnlyPages={['/']}
    >
      {children}
    </GuildLayout>
  );
};

export default RootLayout;
