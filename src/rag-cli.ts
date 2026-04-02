import { answerWithContext, getRagIndex, queryRag } from './rag';

function printUsage() {
  console.log('Usage:');
  console.log('  node dist/rag-cli.js --index');
  console.log('  node dist/rag-cli.js --query "your question" [--topk 5]');
}

function getArgValue(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--index')) {
    const stats = await getRagIndex(true);
    console.log(JSON.stringify({ ok: true, stats }, null, 2));
    return;
  }

  const query = getArgValue(args, '--query') ?? args.join(' ').trim();
  if (!query) {
    printUsage();
    process.exit(1);
  }

  const topKRaw = getArgValue(args, '--topk');
  const topK = topKRaw ? Number(topKRaw) : 5;

  const summary = await answerWithContext(query, Number.isFinite(topK) ? topK : 5);
  console.log(summary.answer);

  const details = await queryRag(query, Number.isFinite(topK) ? topK : 5);
  console.log('\nContext snippets:\n');
  for (const item of details.results) {
    console.log(`- ${item.id} [${item.score.toFixed(3)}]`);
    console.log(`  ${item.content.slice(0, 260).replace(/\s+/g, ' ')}...`);
  }
}

main().catch((error) => {
  console.error('RAG CLI failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
