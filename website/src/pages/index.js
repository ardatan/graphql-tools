import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: <>The GraphQL-first philosophy</>,
    imageUrl: 'img/graphql.svg',
    description: (
      <>
      Use the GraphQL schema definition language to <a href="/docs/generate-schema">generate a schema</a> with full support for resolvers, interfaces, unions, and custom scalars. The schema produced is completely compatible with <a href="https://github.com/graphql/graphql-js">GraphQL.js</a>.
      </>
    ),
  },
  {
    title: <>Mock your GraphQL API</>,
    imageUrl: 'img/flask.svg',
    description: (
      <>
      With GraphQL Tools, you can <a href="/docs/mocking">mock your GraphQL API</a> with fine-grained per-type mocking for fast prototyping without any datasources.
      </>
    ),
  },
  {
    title: <>Stitch multiple GraphQL Schemas</>,
    imageUrl: 'img/needle.svg',
    description: (
      <>
        Automatically <a href="/docs/schema-stitching">stitch multiple schemas together</a> into one larger API in a simple, fast and powerful way
      </>
    ),
  },
];

function Feature({imageUrl, title, description}) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const {siteConfig = {}} = context;
  return (
    <Layout
      title="Welcome"
      description={siteConfig.tagline}>
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
 {/*         <h1 className="hero__title">{siteConfig.title}</h1>
  <p className="hero__subtitle">{siteConfig.tagline}</p>*/}
          <img src="/img/banner.gif" />
          <p>
            <img src="https://img.shields.io/npm/v/graphql-tools?color=%231441d6&label=stable&style=for-the-badge" />
          </p>
          <div className={styles.buttons}>
            <Link
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/introduction')}>
              View Docs
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;
