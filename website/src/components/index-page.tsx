import { ReactElement } from 'react';
import { FeatureList, HeroGradient, IFeatureListProps } from '@theguild/components';

import graphql from 'public/assets/graphql.svg';
import needle from 'public/assets/needle.svg';
import flask from 'public/assets/flask.svg';

const FEATURE_LIST: IFeatureListProps['items'] = [
  {
    title: 'GraphQL-First Philosophy',
    description:
      'Use the GraphQL schema definition language to generate a schema with full support for resolvers, interfaces, unions, and custom scalars.',
    image: {
      src: graphql,
      alt: '',
      loading: 'eager',
      placeholder: 'empty',
    },
    link: {
      children: 'Learn more',
      href: '/docs/introduction',
    },
  },
  {
    title: 'Mock Your GraphQL API',
    description:
      'With GraphQL Tools, you can mock your GraphQL API with fine-grained per-type mocking for fast prototyping without any datasources.',
    image: {
      src: flask,
      alt: '',
      loading: 'eager',
      placeholder: 'empty',
    },
    link: {
      children: 'Learn more',
      href: '/docs/introduction',
    },
  },
  {
    title: 'Stitch Multiple Schemas',
    description:
      'Automatically stitch multiple schemas together into one larger API in a simple, fast and powerful way.',
    image: {
      src: needle,
      alt: '',
      loading: 'eager',
      placeholder: 'empty',
    },
    link: {
      children: 'Learn more',
      href: '/docs/introduction',
    },
  },
];

export function IndexPage(): ReactElement {
  return (
    <>
      <HeroGradient
        title="A Set of Utilities for Faster Development of GraphQL Schemas"
        description="GraphQL Tools is a set of NPM packages and an opinionated structure for how to build a GraphQL schema and resolvers in JavaScript, following the GraphQL-first development workflow."
        link={{
          children: 'Get Started',
          title: 'Learn more about GraphQL Tools',
          href: '/docs/introduction',
        }}
        colors={['#000246', '#184BE6']}
      />
      <FeatureList items={FEATURE_LIST} className="[&_h3]:mt-6" />
    </>
  );
}
