/**
 * Interactive manual test runner for the RAG services module.
 *
 * Usage examples:
 *   node test-rag-services.js <namespace>
 *   RAG_TEST_NAMESPACE=my-doc node test-rag-services.js
 *
 * The script keeps prompting for user messages, calls
 * ragServices.retrieveContextFromVector, and prints the answer.
 */

const path = require('path');
const readline = require('readline');

// Ensure environment variables are loaded (if .env exists in project root)
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: false
});

const ragServices = require('./services/ragServices');

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function questionAsync(rl, prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  const args = process.argv.slice(2);
  // const namespaceFromArg = args.length > 0 ? args[0] : process.env.RAG_TEST_NAMESPACE || process.env.PINECONE_NAMESPACE;
  const namespaceFromArg = "basic-concepts-gst-1763464138190-94810510"
  
  const namespace = namespaceFromArg?.trim();

  if (!namespace) {
    console.error('❌ Namespace missing. Provide as CLI arg or set RAG_TEST_NAMESPACE/PINECONE_NAMESPACE.');
    process.exit(1);
  }

  const rl = createInterface();
  console.log('-----------------------------------------------------');
  console.log('Interactive RAG context tester');
  console.log(`Using namespace: ${namespace}`);
  console.log('Type "exit" or press Ctrl+C to stop.');
  console.log('-----------------------------------------------------');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const userMessage = await questionAsync(rl, '\nuserMessage> ');
    if (!userMessage || userMessage.trim().length === 0) {
      console.log('Please enter a non-empty message (or type "exit" to quit).');
      continue;
    }

    if (userMessage.trim().toLowerCase() === 'exit') {
      break;
    }

    console.log('\n🔍 Retrieving context and generating answer...');

    try {
      const answer = await ragServices.retrieveContextFromVector(userMessage, {
        namespace,
        topK: Number(process.env.RAG_TEST_TOPK) || 5,
        indexName: process.env.RAG_TEST_INDEX || process.env.PINECONE_INDEX,
        llmModel: process.env.RAG_TEST_LLM || 'gpt-4o-mini'
      });

      console.log('\n✅ Answer:\n');
      console.log(answer);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
  }

  rl.close();
  console.log('\n👋 Exiting interactive tester.');
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});



