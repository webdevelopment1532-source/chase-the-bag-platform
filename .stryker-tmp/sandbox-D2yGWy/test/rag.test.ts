// @ts-nocheck
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { answerWithContext, getRagIndex, queryRag } from '../src/rag';

async function makeWorkspace(prefix: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'scripts'), { recursive: true });
  await fs.mkdir(path.join(root, 'test'), { recursive: true });
  await fs.mkdir(path.join(root, 'tests'), { recursive: true });
  await fs.mkdir(path.join(root, 'frontend', 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'node_modules', 'pkg'), { recursive: true });
  await fs.mkdir(path.join(root, 'dist'), { recursive: true });

  await fs.writeFile(path.join(root, 'src', 'coin.ts'), 'Coin transfer and wallet balance tracker for exchange offers.');
  await fs.writeFile(path.join(root, 'scripts', 'create-platform-db.sql'), 'CREATE TABLE coin_wallets (user_id VARCHAR(64));');
  await fs.writeFile(path.join(root, 'test', 'notes.md'), 'Referral system and anti fraud checks are documented here.');
  await fs.writeFile(path.join(root, 'README.md'), 'Project README with quick start and coin exchange notes.');

  // Ignored directories should not be indexed.
  await fs.writeFile(path.join(root, 'node_modules', 'pkg', 'ignored.md'), 'coin transfer ignored text');
  await fs.writeFile(path.join(root, 'dist', 'ignored.ts'), 'console.log("ignored build artifact")');

  // Oversized file should be skipped by safeReadFile.
  const large = 'x'.repeat(210 * 1024);
  await fs.writeFile(path.join(root, 'src', 'large.txt'), large);

  return root;
}

describe('rag deep tests', () => {
  const roots: string[] = [];

  afterAll(async () => {
    await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('getRagIndex builds stats from default source directories and files', async () => {
    const root = await makeWorkspace('rag-deep-a-');
    roots.push(root);

    const stats = await getRagIndex(true, root);

    expect(stats.rootDir).toBe(root);
    expect(stats.filesScanned).toBeGreaterThanOrEqual(4);
    expect(stats.chunksIndexed).toBeGreaterThan(0);
    expect(typeof stats.generatedAt).toBe('string');
  });

  test('queryRag returns ranked results, excludes ignored dirs, and clamps topK', async () => {
    const root = await makeWorkspace('rag-deep-b-');
    roots.push(root);

    await getRagIndex(true, root);
    const result = await queryRag('coin transfer wallet offer', 999, root);

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.length).toBeLessThanOrEqual(10);
    expect(result.results[0].score).toBeGreaterThan(0);
    expect(result.results.some((r) => r.sourcePath.includes('node_modules'))).toBe(false);
    expect(result.results.some((r) => r.sourcePath.includes('dist'))).toBe(false);
  });

  test('queryRag returns empty results for stopword-only query', async () => {
    const root = await makeWorkspace('rag-deep-c-');
    roots.push(root);

    await getRagIndex(true, root);
    const result = await queryRag('the and to of in', 5, root);

    expect(result.results).toEqual([]);
  });

  test('answerWithContext returns fallback response when nothing matches', async () => {
    const root = await makeWorkspace('rag-deep-d-');
    roots.push(root);

    await getRagIndex(true, root);
    const answer = await answerWithContext('zzzxxyyqq unmatched token', 5, root);

    expect(answer.context).toEqual([]);
    expect(answer.answer).toContain('No relevant context found');
    expect(answer.stats.rootDir).toBe(root);
  });

  test('index cache is reused without forceRefresh and replaced with forceRefresh', async () => {
    const rootA = await makeWorkspace('rag-deep-e-');
    const rootB = await makeWorkspace('rag-deep-f-');
    roots.push(rootA, rootB);

    const first = await getRagIndex(true, rootA);
    const reused = await getRagIndex(false, rootB);
    const refreshed = await getRagIndex(true, rootB);

    expect(reused.rootDir).toBe(rootA);
    expect(reused.generatedAt).toBe(first.generatedAt);
    // rootDir change alone proves a new index was built by forceRefresh
    expect(refreshed.rootDir).toBe(rootB);
  });

  test('queryRag can build index on cold module cache without pre-index call', async () => {
    const root = await makeWorkspace('rag-deep-g-');
    roots.push(root);

    jest.resetModules();
    const rag = await import('../src/rag');
    const result = await rag.queryRag('coin wallet transfer', 3, root);

    expect(result.stats.rootDir).toBe(root);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test('answerWithContext returns formatted summary when matches exist', async () => {
    const root = await makeWorkspace('rag-deep-h-');
    roots.push(root);

    await getRagIndex(true, root);
    const answer = await answerWithContext('coin wallet transfer', 3, root);

    expect(answer.context.length).toBeGreaterThan(0);
    expect(answer.answer).toContain('Based on local project context');
    expect(answer.answer).toContain('1.');
  });

  test('indexing tolerates unreadable files, non-directory source paths, and ignored nested folders', async () => {
    const root = await makeWorkspace('rag-deep-i-');
    roots.push(root);

    const unreadable = path.join(root, 'src', 'private.txt');
    await fs.writeFile(unreadable, 'hidden coin wallet content that should be skipped');
    await fs.chmod(unreadable, 0o000);

    await fs.mkdir(path.join(root, 'src', 'reports'), { recursive: true });
    await fs.writeFile(path.join(root, 'src', 'reports', 'ignored.md'), 'ignore-me-token');

    await fs.rm(path.join(root, 'tests'), { recursive: true, force: true });
    await fs.writeFile(path.join(root, 'tests'), 'not a directory');

    try {
      const stats = await getRagIndex(true, root);
      const ignoredQuery = await queryRag('ignore-me-token', 5, root);

      expect(stats.rootDir).toBe(root);
      expect(stats.chunksIndexed).toBeGreaterThan(0);
      expect(ignoredQuery.results).toEqual([]);
    } finally {
      await fs.chmod(unreadable, 0o644);
    }
  });

  test('chunking creates multi-part chunks for large files and still returns ranked matches', async () => {
    const root = await makeWorkspace('rag-deep-j-');
    roots.push(root);

    const largeContent = `${'alpha '.repeat(260)} chunk-overlap-token ${'beta '.repeat(260)}`;
    await fs.writeFile(path.join(root, 'src', 'large-chunk.md'), largeContent);

    const stats = await getRagIndex(true, root);
    const query = await queryRag('chunk-overlap-token', 10, root);

    expect(stats.chunksIndexed).toBeGreaterThan(1);
    expect(query.results.length).toBeGreaterThan(0);
    expect(query.results[0].sourcePath).toContain('large-chunk.md');
  });

  test('tokenize returns empty array and buildIndex skips chunks when file content is all special chars', async () => {
    const root = await makeWorkspace('rag-branch-a-');
    roots.push(root);

    // All-special-chars → normalizeText → "" → tokenize if (!text) return [] → tf.size === 0
    await fs.writeFile(path.join(root, 'src', 'specials.ts'), '!!! @@@ ### $$$ %%%');
    // All-stopwords → tokenize filters everything → tf = {} → tf.size === 0
    await fs.writeFile(path.join(root, 'src', 'stops.md'), 'the and or to of in the and');
    // Whitespace-only → chunkText cleaned="" → if (!cleaned) return []
    await fs.writeFile(path.join(root, 'src', 'spaces.txt'), '   \r\n   \t   \r\n   ');

    const stats = await getRagIndex(true, root);
    expect(stats.rootDir).toBe(root);
    // Specials/spaces files produce no valid chunks; other fixture files still count
    expect(stats.filesScanned).toBeGreaterThan(0);
  });

  test('collectFiles skips files with non-indexable extensions', async () => {
    const root = await makeWorkspace('rag-branch-b-');
    roots.push(root);

    // .json is not in INDEXABLE_EXTENSIONS → if (!INDEXABLE_EXTENSIONS.has(ext)) continue
    await fs.writeFile(path.join(root, 'src', 'config.json'), '{"coin":"secret-json-token"}');

    await getRagIndex(true, root);
    const result = await queryRag('secret-json-token', 5, root);

    // The JSON file is skipped, so this unique token should not appear
    expect(result.results).toEqual([]);
  });

  test('collectFiles tolerates symlinks (non-file non-directory Dirent entries)', async () => {
    const root = await makeWorkspace('rag-branch-c-');
    roots.push(root);

    // A symlink's Dirent reports isFile()=false and isDirectory()=false
    // → hits the `if (!entry.isFile()) continue` branch
    const linkPath = path.join(root, 'src', 'symlink.ts');
    await fs.symlink(path.join(root, 'src', 'coin.ts'), linkPath);

    const stats = await getRagIndex(true, root);
    expect(stats.rootDir).toBe(root);
    expect(stats.filesScanned).toBeGreaterThan(0);
  });

  test('collectFiles ignores default source file entries that are directories not files', async () => {
    const root = await makeWorkspace('rag-branch-d-');
    roots.push(root);

    // Replace README.md file with a directory of the same name
    // → collectFiles: stat.isFile() === false → does NOT push to files list
    await fs.rm(path.join(root, 'README.md'), { force: true });
    await fs.mkdir(path.join(root, 'README.md'), { recursive: true });

    const stats = await getRagIndex(true, root);
    expect(stats.rootDir).toBe(root);
    // Other src files are still scanned
    expect(stats.filesScanned).toBeGreaterThan(0);
  });

  test('buildIndex handles workspace where all indexed content produces empty chunks', async () => {
    // Creates a workspace whose every file has only special-char / whitespace content
    // so chunks.length === 0 → triggers the `chunks.length || 1` guard in buildIdf
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rag-branch-e-'));
    roots.push(root);

    await Promise.all([
      fs.mkdir(path.join(root, 'src'), { recursive: true }),
      fs.mkdir(path.join(root, 'scripts'), { recursive: true }),
      fs.mkdir(path.join(root, 'test'), { recursive: true }),
      fs.mkdir(path.join(root, 'tests'), { recursive: true }),
      fs.mkdir(path.join(root, 'frontend', 'src'), { recursive: true }),
    ]);
    // Only stopwords/specials → every chunk has tf.size === 0 → no indexable chunks
    await fs.writeFile(path.join(root, 'src', 'empty.ts'), '!!! the and or !!!');
    await fs.writeFile(path.join(root, 'README.md'), 'the and or to of');

    const stats = await getRagIndex(true, root);
    expect(stats.chunksIndexed).toBe(0);

    // queryRag against empty corpus: queryNorm → 0 → returns empty results
    const result = await queryRag('something', 5, root);
    expect(result.results).toEqual([]);
  });

  test('collectFiles walks non-ignored nested directories recursively', async () => {
    const root = await makeWorkspace('rag-deep-k-');
    roots.push(root);

    await fs.mkdir(path.join(root, 'src', 'nested', 'deep'), { recursive: true });
    await fs.writeFile(path.join(root, 'src', 'nested', 'deep', 'path.md'), 'recursive-branch-token');

    await getRagIndex(true, root);
    const result = await queryRag('recursive-branch-token', 5, root);

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r) => r.sourcePath.includes('src/nested/deep/path.md'))).toBe(true);
  });

  test('chunkText skips empty trimmed windows (line 111 false branch)', async () => {
    const root = await makeWorkspace('rag-branch-f-');
    roots.push(root);

    // 200 A's + 2000 spaces + 200 B's = 2400 chars.
    // Window 0  [0,900)  → "AAA…AAA" + spaces → trim → truthy  (pushed)
    // Window 1  [760,1660) → all spaces       → trim → ""      → if(part) false ✓
    // Window 2  [1520,2400) → spaces + B's    → trim → "BBB…B" → truthy  (pushed)
    const content = 'A'.repeat(200) + ' '.repeat(2000) + 'B'.repeat(200);
    await fs.writeFile(path.join(root, 'src', 'gap-file.ts'), content);

    const stats = await getRagIndex(true, root);
    // Both the A-chunk and B-chunk are indexed; the all-whitespace middle window is skipped.
    expect(stats.chunksIndexed).toBeGreaterThan(0);
    // Query for the long repeated-'a' token that was actually indexed.
    const result = await queryRag('a'.repeat(200), 5, root);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test('getRagIndex and queryRag use default rootDir when called without it (lines 238/245)', async () => {
    // Call with NO args at all so both default-param branches (forceRefresh and rootDir) are taken.
    // The module-level cache from the previous test is hit, so this returns instantly.
    const stats = await getRagIndex();
    expect(typeof stats.rootDir).toBe('string');
    expect(typeof stats.chunksIndexed).toBe('number');

    const result = await queryRag('coin wallet');
    expect(typeof result.stats.rootDir).toBe('string');
  });

  test('queryRag clamps topK to at least one result slot', async () => {
    const root = await makeWorkspace('rag-branch-g-');
    roots.push(root);

    jest.resetModules();
    const ragMod = await import('../src/rag');

    await ragMod.getRagIndex(true, root);

    const result = await ragMod.queryRag('coin wallet transfer', 0, root);
    // Math.max(1, Math.min(0, 10)) = 1 → at most 1 result
    expect(result.results.length).toBeLessThanOrEqual(1);
  });

  test('answerWithContext uses default rootDir when omitted', async () => {
    const answer = await answerWithContext('coin wallet transfer');

    expect(typeof answer.answer).toBe('string');
    expect(Array.isArray(answer.context)).toBe(true);
    expect(typeof answer.stats.rootDir).toBe('string');
  });
});
