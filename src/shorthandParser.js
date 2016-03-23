import graphqlShorthandParser from 'graphql-shorthand-parser';

// we wrap the parser to get useful error messages
// see: https://github.com/pegjs/pegjs/issues/314

// @p shorthand parser
// @data string for parsing
const parse = (data) => {
  console.time('Parse time');
  try {
    return graphqlShorthandParser.parse(data);
  } catch (e) {
    if (e instanceof graphqlShorthandParser.SyntaxError) {
      console.log('Error in input file:');
      const errLine = e.location.start.line;
      const errCol = e.location.start.column;
      const line = data.split(/\r\n|\r|\n/)[errLine - 1];
      console.log(line);
      console.log(`${dup(' ', errCol)}^`);
      console.log(`Line ${errLine}, column ${errCol}: ${e.message}`);
      console.log(e.stack);
      throw e;
    } else {
      console.log(e);
      console.log(e.stack);
    }
  }
  return null;
};

// helper function that repeats a string count times
const dup = (str, count) => {
  return new Array(count).join(str);
};

const SyntaxError = graphqlShorthandParser.SyntaxError;

export { parse, SyntaxError };
