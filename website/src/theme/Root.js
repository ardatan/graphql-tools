import React from 'react';
import { ThemeProvider, GlobalStyles, Header, FooterExtended } from '@theguild/components';

// Default implementation, that you can customize
function Root({ children }) {
  return (
    <ThemeProvider>
      <GlobalStyles includeFonts />
      <Header themeSwitch activeLink={'/open-source'} accentColor="var(--ifm-color-primary)" />
      {children}
      <FooterExtended
        resources={[
          {
            children: 'Stack Overflow',
            title: 'Check questions on Stack Overflow',
            href: 'https://stackoverflow.com/questions/tagged/graphql-tools',
            target: '_blank',
          },
        ]}
      />
    </ThemeProvider>
  );
}

export default Root;
