import { CodeFileLoader } from '../src/index.js';

describe('Schema From Export', () => {
  const loader = new CodeFileLoader();

  it('should load the schema correctly from module.exports', async () => {
    const result = await loader.load('./test-files/loaders/module-exports.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema (with extend) correctly from module.exports', async () => {
    const result = await loader.load('./test-files/loaders/with-extend.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema correctly from variable export', async () => {
    const result = await loader.load('./test-files/loaders/schema-export.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema correctly from default export', async () => {
    const result = await loader.load('./test-files/loaders/default-export.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema correctly from promise export', async () => {
    const result = await loader.load('./test-files/loaders/promise-export.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });
});

describe('Schema From Export (sync)', () => {
  const loader = new CodeFileLoader();

  it('should load the schema correctly from module.exports', () => {
    const result = loader.loadSync('./test-files/loaders/module-exports.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema (with extend) correctly from module.exports', () => {
    const result = loader.loadSync('./test-files/loaders/with-extend.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema correctly from variable export', () => {
    const result = loader.loadSync('./test-files/loaders/schema-export.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });

  it('should load the schema correctly from default export', () => {
    const result = loader.loadSync('./test-files/loaders/default-export.js', {
      cwd: __dirname,
    });
    expect(result?.[0]).toBeDefined();
  });
});
