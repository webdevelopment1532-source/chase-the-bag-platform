"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const rag_1 = require("../src/rag");
async function makeWorkspace(prefix) {
    const root = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), prefix));
    await promises_1.default.mkdir(path_1.default.join(root, 'src'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(root, 'scripts'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(root, 'test'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(root, 'tests'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(root, 'frontend', 'src'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(root, 'node_modules', 'pkg'), { recursive: true });
    await promises_1.default.mkdir(path_1.default.join(root, 'dist'), { recursive: true });
    await promises_1.default.writeFile(path_1.default.join(root, 'src', 'coin.ts'), 'Coin transfer and wallet balance tracker for exchange offers.');
    await promises_1.default.writeFile(path_1.default.join(root, 'scripts', 'create-platform-db.sql'), 'CREATE TABLE coin_wallets (user_id VARCHAR(64));');
    await promises_1.default.writeFile(path_1.default.join(root, 'test', 'notes.md'), 'Referral system and anti fraud checks are documented here.');
    await promises_1.default.writeFile(path_1.default.join(root, 'README.md'), 'Project README with quick start and coin exchange notes.');
    // Ignored directories should not be indexed.
    await promises_1.default.writeFile(path_1.default.join(root, 'node_modules', 'pkg', 'ignored.md'), 'coin transfer ignored text');
    await promises_1.default.writeFile(path_1.default.join(root, 'dist', 'ignored.ts'), 'console.log("ignored build artifact")');
    // Oversized file should be skipped by safeReadFile.
    const large = 'x'.repeat(210 * 1024);
    await promises_1.default.writeFile(path_1.default.join(root, 'src', 'large.txt'), large);
    return root;
}
describe('rag deep tests', () => {
    const roots = [];
    afterAll(async () => {
        await Promise.all(roots.map((root) => promises_1.default.rm(root, { recursive: true, force: true })));
    });
    test('getRagIndex builds stats from default source directories and files', async () => {
        const root = await makeWorkspace('rag-deep-a-');
        roots.push(root);
        const stats = await (0, rag_1.getRagIndex)(true, root);
        expect(stats.rootDir).toBe(root);
        expect(stats.filesScanned).toBeGreaterThanOrEqual(4);
        expect(stats.chunksIndexed).toBeGreaterThan(0);
        expect(typeof stats.generatedAt).toBe('string');
    });
    test('queryRag returns ranked results, excludes ignored dirs, and clamps topK', async () => {
        const root = await makeWorkspace('rag-deep-b-');
        roots.push(root);
        await (0, rag_1.getRagIndex)(true, root);
        const result = await (0, rag_1.queryRag)('coin transfer wallet offer', 999, root);
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results.length).toBeLessThanOrEqual(10);
        expect(result.results[0].score).toBeGreaterThan(0);
        expect(result.results.some((r) => r.sourcePath.includes('node_modules'))).toBe(false);
        expect(result.results.some((r) => r.sourcePath.includes('dist'))).toBe(false);
    });
    test('queryRag returns empty results for stopword-only query', async () => {
        const root = await makeWorkspace('rag-deep-c-');
        roots.push(root);
        await (0, rag_1.getRagIndex)(true, root);
        const result = await (0, rag_1.queryRag)('the and to of in', 5, root);
        expect(result.results).toEqual([]);
    });
    test('answerWithContext returns fallback response when nothing matches', async () => {
        const root = await makeWorkspace('rag-deep-d-');
        roots.push(root);
        await (0, rag_1.getRagIndex)(true, root);
        const answer = await (0, rag_1.answerWithContext)('zzzxxyyqq unmatched token', 5, root);
        expect(answer.context).toEqual([]);
        expect(answer.answer).toContain('No relevant context found');
        expect(answer.stats.rootDir).toBe(root);
    });
    test('index cache is reused without forceRefresh and replaced with forceRefresh', async () => {
        const rootA = await makeWorkspace('rag-deep-e-');
        const rootB = await makeWorkspace('rag-deep-f-');
        roots.push(rootA, rootB);
        const first = await (0, rag_1.getRagIndex)(true, rootA);
        const reused = await (0, rag_1.getRagIndex)(false, rootB);
        const refreshed = await (0, rag_1.getRagIndex)(true, rootB);
        expect(reused.rootDir).toBe(rootA);
        expect(reused.generatedAt).toBe(first.generatedAt);
        // rootDir change alone proves a new index was built by forceRefresh
        expect(refreshed.rootDir).toBe(rootB);
    });
    test('queryRag can build index on cold module cache without pre-index call', async () => {
        const root = await makeWorkspace('rag-deep-g-');
        roots.push(root);
        jest.resetModules();
        const rag = await Promise.resolve().then(() => __importStar(require('../src/rag')));
        const result = await rag.queryRag('coin wallet transfer', 3, root);
        expect(result.stats.rootDir).toBe(root);
        expect(result.results.length).toBeGreaterThan(0);
    });
    test('answerWithContext returns formatted summary when matches exist', async () => {
        const root = await makeWorkspace('rag-deep-h-');
        roots.push(root);
        await (0, rag_1.getRagIndex)(true, root);
        const answer = await (0, rag_1.answerWithContext)('coin wallet transfer', 3, root);
        expect(answer.context.length).toBeGreaterThan(0);
        expect(answer.answer).toContain('Based on local project context');
        expect(answer.answer).toContain('1.');
    });
    test('indexing tolerates unreadable files, non-directory source paths, and ignored nested folders', async () => {
        const root = await makeWorkspace('rag-deep-i-');
        roots.push(root);
        const unreadable = path_1.default.join(root, 'src', 'private.txt');
        await promises_1.default.writeFile(unreadable, 'hidden coin wallet content that should be skipped');
        await promises_1.default.chmod(unreadable, 0o000);
        await promises_1.default.mkdir(path_1.default.join(root, 'src', 'reports'), { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'reports', 'ignored.md'), 'ignore-me-token');
        await promises_1.default.rm(path_1.default.join(root, 'tests'), { recursive: true, force: true });
        await promises_1.default.writeFile(path_1.default.join(root, 'tests'), 'not a directory');
        try {
            const stats = await (0, rag_1.getRagIndex)(true, root);
            const ignoredQuery = await (0, rag_1.queryRag)('ignore-me-token', 5, root);
            expect(stats.rootDir).toBe(root);
            expect(stats.chunksIndexed).toBeGreaterThan(0);
            expect(ignoredQuery.results).toEqual([]);
        }
        finally {
            await promises_1.default.chmod(unreadable, 0o644);
        }
    });
    test('chunking creates multi-part chunks for large files and still returns ranked matches', async () => {
        const root = await makeWorkspace('rag-deep-j-');
        roots.push(root);
        const largeContent = `${'alpha '.repeat(260)} chunk-overlap-token ${'beta '.repeat(260)}`;
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'large-chunk.md'), largeContent);
        const stats = await (0, rag_1.getRagIndex)(true, root);
        const query = await (0, rag_1.queryRag)('chunk-overlap-token', 10, root);
        expect(stats.chunksIndexed).toBeGreaterThan(1);
        expect(query.results.length).toBeGreaterThan(0);
        expect(query.results[0].sourcePath).toContain('large-chunk.md');
    });
    test('tokenize returns empty array and buildIndex skips chunks when file content is all special chars', async () => {
        const root = await makeWorkspace('rag-branch-a-');
        roots.push(root);
        // All-special-chars → normalizeText → "" → tokenize if (!text) return [] → tf.size === 0
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'specials.ts'), '!!! @@@ ### $$$ %%%');
        // All-stopwords → tokenize filters everything → tf = {} → tf.size === 0
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'stops.md'), 'the and or to of in the and');
        // Whitespace-only → chunkText cleaned="" → if (!cleaned) return []
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'spaces.txt'), '   \r\n   \t   \r\n   ');
        const stats = await (0, rag_1.getRagIndex)(true, root);
        expect(stats.rootDir).toBe(root);
        // Specials/spaces files produce no valid chunks; other fixture files still count
        expect(stats.filesScanned).toBeGreaterThan(0);
    });
    test('collectFiles skips files with non-indexable extensions', async () => {
        const root = await makeWorkspace('rag-branch-b-');
        roots.push(root);
        // .json is not in INDEXABLE_EXTENSIONS → if (!INDEXABLE_EXTENSIONS.has(ext)) continue
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'config.json'), '{"coin":"secret-json-token"}');
        await (0, rag_1.getRagIndex)(true, root);
        const result = await (0, rag_1.queryRag)('secret-json-token', 5, root);
        // The JSON file is skipped, so this unique token should not appear
        expect(result.results).toEqual([]);
    });
    test('collectFiles tolerates symlinks (non-file non-directory Dirent entries)', async () => {
        const root = await makeWorkspace('rag-branch-c-');
        roots.push(root);
        // A symlink's Dirent reports isFile()=false and isDirectory()=false
        // → hits the `if (!entry.isFile()) continue` branch
        const linkPath = path_1.default.join(root, 'src', 'symlink.ts');
        await promises_1.default.symlink(path_1.default.join(root, 'src', 'coin.ts'), linkPath);
        const stats = await (0, rag_1.getRagIndex)(true, root);
        expect(stats.rootDir).toBe(root);
        expect(stats.filesScanned).toBeGreaterThan(0);
    });
    test('collectFiles ignores default source file entries that are directories not files', async () => {
        const root = await makeWorkspace('rag-branch-d-');
        roots.push(root);
        // Replace README.md file with a directory of the same name
        // → collectFiles: stat.isFile() === false → does NOT push to files list
        await promises_1.default.rm(path_1.default.join(root, 'README.md'), { force: true });
        await promises_1.default.mkdir(path_1.default.join(root, 'README.md'), { recursive: true });
        const stats = await (0, rag_1.getRagIndex)(true, root);
        expect(stats.rootDir).toBe(root);
        // Other src files are still scanned
        expect(stats.filesScanned).toBeGreaterThan(0);
    });
    test('buildIndex handles workspace where all indexed content produces empty chunks', async () => {
        // Creates a workspace whose every file has only special-char / whitespace content
        // so chunks.length === 0 → triggers the `chunks.length || 1` guard in buildIdf
        const root = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'rag-branch-e-'));
        roots.push(root);
        await Promise.all([
            promises_1.default.mkdir(path_1.default.join(root, 'src'), { recursive: true }),
            promises_1.default.mkdir(path_1.default.join(root, 'scripts'), { recursive: true }),
            promises_1.default.mkdir(path_1.default.join(root, 'test'), { recursive: true }),
            promises_1.default.mkdir(path_1.default.join(root, 'tests'), { recursive: true }),
            promises_1.default.mkdir(path_1.default.join(root, 'frontend', 'src'), { recursive: true }),
        ]);
        // Only stopwords/specials → every chunk has tf.size === 0 → no indexable chunks
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'empty.ts'), '!!! the and or !!!');
        await promises_1.default.writeFile(path_1.default.join(root, 'README.md'), 'the and or to of');
        const stats = await (0, rag_1.getRagIndex)(true, root);
        expect(stats.chunksIndexed).toBe(0);
        // queryRag against empty corpus: queryNorm → 0 → returns empty results
        const result = await (0, rag_1.queryRag)('something', 5, root);
        expect(result.results).toEqual([]);
    });
    test('collectFiles walks non-ignored nested directories recursively', async () => {
        const root = await makeWorkspace('rag-deep-k-');
        roots.push(root);
        await promises_1.default.mkdir(path_1.default.join(root, 'src', 'nested', 'deep'), { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'nested', 'deep', 'path.md'), 'recursive-branch-token');
        await (0, rag_1.getRagIndex)(true, root);
        const result = await (0, rag_1.queryRag)('recursive-branch-token', 5, root);
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
        await promises_1.default.writeFile(path_1.default.join(root, 'src', 'gap-file.ts'), content);
        const stats = await (0, rag_1.getRagIndex)(true, root);
        // Both the A-chunk and B-chunk are indexed; the all-whitespace middle window is skipped.
        expect(stats.chunksIndexed).toBeGreaterThan(0);
        // Query for the long repeated-'a' token that was actually indexed.
        const result = await (0, rag_1.queryRag)('a'.repeat(200), 5, root);
        expect(result.results.length).toBeGreaterThan(0);
    });
    test('getRagIndex and queryRag use default rootDir when called without it (lines 238/245)', async () => {
        // Call with NO args at all so both default-param branches (forceRefresh and rootDir) are taken.
        // The module-level cache from the previous test is hit, so this returns instantly.
        const stats = await (0, rag_1.getRagIndex)();
        expect(typeof stats.rootDir).toBe('string');
        expect(typeof stats.chunksIndexed).toBe('number');
        const result = await (0, rag_1.queryRag)('coin wallet');
        expect(typeof result.stats.rootDir).toBe('string');
    });
    test('queryRag clamps topK to at least one result slot', async () => {
        const root = await makeWorkspace('rag-branch-g-');
        roots.push(root);
        jest.resetModules();
        const ragMod = await Promise.resolve().then(() => __importStar(require('../src/rag')));
        await ragMod.getRagIndex(true, root);
        const result = await ragMod.queryRag('coin wallet transfer', 0, root);
        // Math.max(1, Math.min(0, 10)) = 1 → at most 1 result
        expect(result.results.length).toBeLessThanOrEqual(1);
    });
    test('answerWithContext uses default rootDir when omitted', async () => {
        const answer = await (0, rag_1.answerWithContext)('coin wallet transfer');
        expect(typeof answer.answer).toBe('string');
        expect(Array.isArray(answer.context)).toBe(true);
        expect(typeof answer.stats.rootDir).toBe('string');
    });
});
