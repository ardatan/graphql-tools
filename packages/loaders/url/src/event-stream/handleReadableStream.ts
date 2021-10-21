// Based on https://github.com/Azure/fetch-event-source/blob/main/src/parse.ts

const enum ControlChars {
  NewLine = 10,
  CarriageReturn = 13,
  Space = 32,
  Colon = 58,
}

/**
 * Represents a message sent in an event stream
 * https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format
 */
export interface EventSourceMessage {
  /** The event ID to set the EventSource object's last event ID value. */
  id: string;
  /** A string identifying the type of event described. */
  event: string;
  /** The event data */
  data: string;
  /** The reconnection interval (in milliseconds) to wait before retrying the connection */
  retry?: number;
}

export async function* handleReadableStream(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();

  let buffer: Uint8Array | undefined;
  let position = 0; // current read position
  let fieldLength = -1; // length of the `field` portion of the line
  let discardTrailingNewline = false;

  try {
    let result: ReadableStreamDefaultReadResult<Uint8Array>;
    let message: EventSourceMessage = {
      data: '',
      event: '',
      id: '',
      retry: undefined,
    };
    while (!(result = await reader.read()).done) {
      const arr = result.value;
      if (buffer === undefined) {
        buffer = arr;
        position = 0;
        fieldLength = -1;
      } else {
        // we're still parsing the old line. Append the new bytes into buffer:
        buffer = concat(buffer, arr);
      }

      const bufLength = buffer.length;
      let lineStart = 0; // index where the current line starts
      while (position < bufLength) {
        if (discardTrailingNewline) {
          if (buffer[position] === ControlChars.NewLine) {
            lineStart = ++position; // skip to next char
          }

          discardTrailingNewline = false;
        }

        // start looking forward till the end of line:
        let lineEnd = -1; // index of the \r or \n char
        for (; position < bufLength && lineEnd === -1; ++position) {
          switch (buffer[position]) {
            case ControlChars.Colon: {
              if (fieldLength === -1) {
                // first colon in line
                fieldLength = position - lineStart;
              }
              break;
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            case ControlChars.CarriageReturn: {
              discardTrailingNewline = true;
            }
            // eslint-disable-next-line no-fallthrough
            case ControlChars.NewLine: {
              lineEnd = position;
              break;
            }
          }
        }

        if (lineEnd === -1) {
          // We reached the end of the buffer but the line hasn't ended.
          // Wait for the next arr and then continue parsing:
          break;
        }

        // we've reached the line end, send it out:
        const line = buffer.subarray(lineStart, lineEnd);
        if (line.length === 0) {
          // empty line denotes end of message. Trigger the callback and start a new message:
          yield JSON.parse(message.data);
          message = {
            data: '',
            event: '',
            id: '',
            retry: undefined,
          };
        } else if (fieldLength > 0) {
          // exclude comments and lines with no values
          // line is of format "<field>:<value>" or "<field>: <value>"
          // https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
          const field = decoder.decode(line.subarray(0, fieldLength));
          const valueOffset = fieldLength + (line[fieldLength + 1] === ControlChars.Space ? 2 : 1);
          const value = decoder.decode(line.subarray(valueOffset));

          switch (field) {
            case 'data':
              // if this message already has data, append the new value to the old.
              // otherwise, just set to the new value:
              message.data = message.data ? message.data + '\n' + value : value; // otherwise,
              break;
            case 'event':
              message.event = value;
              break;
            case 'id':
              message.id = value;
              break;
            case 'retry': {
              const retry = parseInt(value, 10);
              message.retry = retry;
              break;
            }
          }
        }
        lineStart = position; // we're now on the next line
        fieldLength = -1;
      }

      if (lineStart === bufLength) {
        buffer = undefined; // we've finished reading it
      } else if (lineStart !== 0) {
        // Create a new view into buffer beginning at lineStart so we don't
        // need to copy over the previous lines when we get the new arr:
        buffer = buffer.subarray(lineStart);
        position -= lineStart;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function concat(a: Uint8Array, b: Uint8Array) {
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
}
