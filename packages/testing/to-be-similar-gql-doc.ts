import matchers from 'expect/build/matchers';
import { parse, DocumentNode } from 'graphql';

declare global {
  namespace jest {
    interface Matchers<R, T> {
      /**
       * Parses the provided string into a DocumentNode and then compares the
       * actual value (which should also be a DocumentNode) to it. Any `loc`
       * properties are stripped from both objects, so the location of nodes
       * inside each document doesn't matter but everything else (i.e. the order
       * of the nodes) does.
       */
      toBeSimilarGqlDoc(expected: string): R;
    }
  }
}

expect.extend({
  toBeSimilarGqlDoc(this, received: DocumentNode, expectedString: string, ...rest) {
    const expected = parse(expectedString, { noLocation: true });
    return matchers.toMatchObject(stripLocation(received), stripLocation(expected));
  },
});

function stripLocation(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripLocation);
  } else if (obj && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (key !== 'loc') {
        acc[key] = stripLocation(obj[key]);
      }
      return acc;
    }, {});
  }
  return obj;
}
