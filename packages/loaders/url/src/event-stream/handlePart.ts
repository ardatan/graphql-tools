import { ExecutionResult } from 'graphql';

export function handlePart(part: string): false | ExecutionResult {
  const eventStr = part.split('event: ')[1];
  const dataStr = part.split('data: ')[1];
  const data = JSON.parse(dataStr);
  if (data.payload && eventStr) {
    if (eventStr === 'complete') {
      return false;
    } else {
      return data.payload;
    }
  }
  return data;
}
