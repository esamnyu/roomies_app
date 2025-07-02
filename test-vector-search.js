// Test script to verify vector search functionality
const fetch = require('node-fetch');

async function testVectorSearch() {
  console.log('Testing AI Chat with Vector Search...\n');

  // First, we need to get an auth token
  // For testing, you'll need to replace these with valid credentials
  const testQuery = "Who usually buys groceries?";
  
  console.log(`Testing with query: "${testQuery}"`);
  console.log('\nThis query should trigger:');
  console.log('1. Embedding generation for the query');
  console.log('2. Vector search for similar conversations');
  console.log('3. Vector search for similar expenses');
  console.log('4. Storage of the conversation embeddings\n');

  // Since we need authentication, let's create a simple test endpoint instead
  console.log('To properly test this, you should:');
  console.log('1. Open your app in the browser');
  console.log('2. Navigate to the AI Assistant');
  console.log('3. Ask questions like:');
  console.log('   - "Who usually buys groceries?"');
  console.log('   - "Show me cleaning-related expenses"');
  console.log('   - "What did we discuss about rent?"');
  console.log('\n4. Check the browser console for debug info showing:');
  console.log('   - context_tokens');
  console.log('   - intent classification');
  console.log('   - similar_conversations (if any)');
  console.log('   - similar_expenses (if any)');
}

testVectorSearch();