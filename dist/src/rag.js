"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRagIndex = getRagIndex;
exports.queryRag = queryRag;
exports.answerWithContext = answerWithContext;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const INDEXABLE_EXTENSIONS = new Set(['.md', '.txt', '.ts', '.js', '.sql']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git', '.stryker-tmp', '.stryker-sandbox', 'reports']);
const DEFAULT_SOURCE_DIRS = ['src', 'scripts', 'test', 'tests', 'frontend/src'];
const DEFAULT_SOURCE_FILES = ['README.md', 'CONTRIBUTING.md'];
const MAX_FILE_BYTES = 200 * 1024;
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 140;
let cachedIndex = null;
function normalizeText(input) {
    return input
        .toLowerCase()
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function tokenize(input) {
    const text = normalizeText(input);
    if (!text)
        return [];
    const stopwords = new Set([
        'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'it', 'this', 'that', 'from',
        'as', 'at', 'by', 'be', 'are', 'was', 'were', 'you', 'your', 'we', 'our', 'can', 'will', 'if', 'not', 'do'
    ]);
    return text
        .split(' ')
        .filter((t) => t.length > 1 && !stopwords.has(t));
}
function buildTermFrequency(text) {
    const tokens = tokenize(text);
    const tf = new Map();
    for (const token of tokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    return tf;
}
function dotProduct(a, b) {
    let score = 0;
    for (const [term, aVal] of a) {
        const bVal = b.get(term) ?? 0;
        if (bVal)
            score += aVal * bVal;
    }
    return score;
}
function vectorNorm(v) {
    let sum = 0;
    for (const value of v.values()) {
        sum += value * value;
    }
    return Math.sqrt(sum);
}
function toTfidfVector(tf, idf) {
    const vector = new Map();
    for (const [term, count] of tf) {
        const weight = count * (idf.get(term) ?? 0);
        if (weight > 0)
            vector.set(term, weight);
    }
    return vector;
}
function chunkText(text) {
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (!cleaned)
        return [];
    const chunks = [];
    let start = 0;
    while (start < cleaned.length) {
        const end = Math.min(cleaned.length, start + CHUNK_SIZE);
        const part = cleaned.slice(start, end).trim();
        if (part)
            chunks.push(part);
        if (end === cleaned.length)
            break;
        start = Math.max(0, end - CHUNK_OVERLAP);
    }
    return chunks;
}
async function safeReadFile(filePath) {
    try {
        const stat = await promises_1.default.stat(filePath);
        if (!stat.isFile() || stat.size > MAX_FILE_BYTES)
            return null;
        return await promises_1.default.readFile(filePath, 'utf8');
    }
    catch {
        return null;
    }
}
async function collectFiles(rootDir) {
    const files = [];
    async function walk(currentDir) {
        let entries = [];
        try {
            entries = await promises_1.default.readdir(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) {
                    await walk(fullPath);
                }
                continue;
            }
            if (!entry.isFile())
                continue;
            const ext = path_1.default.extname(entry.name).toLowerCase();
            if (!INDEXABLE_EXTENSIONS.has(ext))
                continue;
            files.push(fullPath);
        }
    }
    for (const dir of DEFAULT_SOURCE_DIRS) {
        await walk(path_1.default.join(rootDir, dir));
    }
    for (const file of DEFAULT_SOURCE_FILES) {
        const fullPath = path_1.default.join(rootDir, file);
        try {
            const stat = await promises_1.default.stat(fullPath);
            if (stat.isFile())
                files.push(fullPath);
        }
        catch {
            // Ignore missing optional files.
        }
    }
    return Array.from(new Set(files));
}
function buildIdf(termFrequencies, documentCount) {
    const docFreq = new Map();
    for (const tf of termFrequencies) {
        for (const term of tf.keys()) {
            docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
        }
    }
    const idf = new Map();
    for (const [term, df] of docFreq) {
        const value = Math.log((documentCount + 1) / (df + 1)) + 1;
        idf.set(term, value);
    }
    return idf;
}
async function buildIndex(rootDir) {
    const files = await collectFiles(rootDir);
    const chunks = [];
    for (const filePath of files) {
        const content = await safeReadFile(filePath);
        if (!content)
            continue;
        const parts = chunkText(content);
        for (let i = 0; i < parts.length; i += 1) {
            const chunkContent = parts[i];
            const tf = buildTermFrequency(chunkContent);
            if (tf.size === 0)
                continue;
            chunks.push({
                id: `${path_1.default.relative(rootDir, filePath)}#${i + 1}`,
                sourcePath: path_1.default.relative(rootDir, filePath),
                content: chunkContent,
                tf,
            });
        }
    }
    const idf = buildIdf(chunks.map((c) => c.tf), chunks.length || 1);
    const indexedChunks = chunks.map((chunk) => {
        const terms = toTfidfVector(chunk.tf, idf);
        return {
            id: chunk.id,
            sourcePath: chunk.sourcePath,
            content: chunk.content,
            terms,
            norm: vectorNorm(terms),
        };
    });
    return {
        chunks: indexedChunks,
        idf,
        stats: {
            rootDir,
            filesScanned: files.length,
            chunksIndexed: indexedChunks.length,
            generatedAt: new Date().toISOString(),
        },
    };
}
async function getRagIndex(forceRefresh = false, rootDir = process.cwd()) {
    if (!cachedIndex || forceRefresh) {
        cachedIndex = await buildIndex(rootDir);
    }
    return cachedIndex.stats;
}
async function queryRag(query, topK = 5, rootDir = process.cwd()) {
    if (!cachedIndex) {
        cachedIndex = await buildIndex(rootDir);
    }
    const queryTf = buildTermFrequency(query);
    const queryVector = toTfidfVector(queryTf, cachedIndex.idf);
    const queryNorm = vectorNorm(queryVector);
    if (queryNorm === 0) {
        return { stats: cachedIndex.stats, results: [] };
    }
    const scored = cachedIndex.chunks
        .map((chunk) => {
        const dot = dotProduct(queryVector, chunk.terms);
        const score = dot / (queryNorm * chunk.norm);
        return {
            id: chunk.id,
            sourcePath: chunk.sourcePath,
            content: chunk.content,
            score,
        };
    })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, Math.min(topK, 10)));
    return {
        stats: cachedIndex.stats,
        results: scored,
    };
}
async function answerWithContext(query, topK = 5, rootDir = process.cwd()) {
    const { stats, results } = await queryRag(query, topK, rootDir);
    if (results.length === 0) {
        return {
            answer: 'No relevant context found in local project files. Try a more specific query.',
            context: [],
            stats,
        };
    }
    const answerLines = [
        `Based on local project context, top ${results.length} matches for: "${query}"`,
        '',
        ...results.map((r, idx) => `${idx + 1}. ${r.sourcePath} (score ${r.score.toFixed(3)})`),
    ];
    return {
        answer: answerLines.join('\n'),
        context: results,
        stats,
    };
}
