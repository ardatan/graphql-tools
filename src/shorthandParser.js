import graphqlShorthandParser from 'graphql-shorthand-parser';

// we wrap the parser to get useful error messages
// see: https://github.com/pegjs/pegjs/issues/314

// @p shorthand parser
// @data string for parsing
const parse = (data) => {
  try {
    return graphqlShorthandParser.parse(data);
  } catch (e) {
    if (e instanceof graphqlShorthandParser.SyntaxError) {
      const message = [];
      message.push('Error in input file:\n');
      const errLine = e.location.start.line;
      const errCol = e.location.start.column;
      const line = data.split(/\r\n|\r|\n/)[errLine - 1];
      message.push(line);
      message.push(`${dup(' ', errCol)}^`);
      message.push(`Line ${errLine}, column ${errCol}: ${e.message}`);
      e.message = message.join('\n');
    }
    throw e;
  }
};

// helper function that repeats a string count times
const dup = (str, count) => {
  return new Array(count).join(str);
};

const SyntaxError = graphqlShorthandParser.SyntaxError;

export { parse, SyntaxError };
