import * as yamlParser from 'yaml-ast-parser';

/**
 * Comments out the current entry of a specific key in a yaml document and creates a new value next to it
 * @param key key in yaml document to comment out
 * @param newValue new value to add in the document
 */
export function replaceYamlValue(input: any, key: any, newValue: any) {
  const ast = yamlParser.safeLoad(input);
  const position = getPosition(ast, key);
  const newEntry = `${key}: ${newValue}\n`;
  if (!position) {
    return input + '\n' + newEntry;
  }

  return (
    input.slice(0, position.start) +
    '#' +
    input.slice(position.start, position.end) +
    newEntry +
    input.slice(position.end)
  );
}

function getPosition(ast: any, key: string): { start: number; end: number } | undefined {
  const mapping = ast.mappings.find((m: any) => m.key.value === key);
  if (!mapping) {
    return undefined;
  }
  return {
    start: mapping.startPosition,
    end: mapping.endPosition + 1,
  };
}

function commentOut(input: string, keys: string[]) {
  let output = input;
  for (const key of keys) {
    const ast = yamlParser.safeLoad(output);
    const position = getPosition(ast, key);

    if (position) {
      output = output.slice(0, position.start) + '#' + output.slice(position.start);
    }
  }

  return output;
}

export function migrateToEndpoint(input: any, endpoint: any) {
  const output = commentOut(input, ['service', 'stage', 'cluster']);
  return replaceYamlValue(output, 'endpoint', endpoint);
}
