const fs = require('fs');
const path = require('path');
let [, , leftPointer, rightPointer] = process.argv;

function createReport(pointer) {
  const [name, file] = pointer.split(':');

  const lines = fs.readFileSync(path.join(process.cwd(), file), 'utf-8').split('\n');

  let sum = 0;
  let count = 0;

  for (let line of lines) {
    if (line.trim().length) {
      const metric = JSON.parse(line);

      if (metric.type === 'Point' && metric.metric === 'http_req_duration' && metric.data.tags.status === '200') {
        count++;
        sum += metric.data.value;
      }
    }
  }

  return {
    name,
    file,
    avg: sum / count,
  };
}

const left = createReport(leftPointer);
const right = createReport(rightPointer);

const fasterName = left.avg < right.avg ? left.name : right.name;

const faster = Math.min(left.avg, right.avg);
const slower = Math.max(left.avg, right.avg);
const byFactor = Math.abs(1 - slower / faster);

console.log(`

${left.name}: ${left.avg.toFixed(2)} ms
${right.name}: ${right.avg.toFixed(2)} ms

Faster is "${fasterName}" by ${(byFactor * 100).toFixed(2)}%

`);
