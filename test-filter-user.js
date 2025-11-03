/**
 * Test filterUserMessages function
 */

const { filterUserMessages } = require('./utils/validation');

function testFilterUserMessages() {
  console.log('🧪 Testing filterUserMessages function...');
  
  // Test with mixed messages
  const mixedMessages = [
    {
      role: 'system',
      content: 'Bạn là AI assistant'
    },
    {
      role: 'user',
      content: 'Hello'
    },
    {
      role: 'assistant',
      content: 'Hi there!'
    },
    {
      role: 'tool',
      content: 'Tool result'
    },
    {
      role: 'user',
      content: 'How are you?'
    },
    {
      role: 'assistant',
      content: 'I am fine, thank you!'
    }
  ];
  
  console.log('📝 Original messages:', JSON.stringify(mixedMessages, null, 2));
  
  const filteredMessages = filterUserMessages(mixedMessages);
  console.log('✅ Filtered user messages:', JSON.stringify(filteredMessages, null, 2));
  
  console.log(`📊 Original: ${mixedMessages.length} messages`);
  console.log(`📊 Filtered: ${filteredMessages.length} messages`);
  console.log(`📊 Removed: ${mixedMessages.length - filteredMessages.length} messages (system + tool)`);
  
  // Verify only user and assistant messages remain
  const hasOnlyUserAndAssistant = filteredMessages.every(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );
  
  console.log(`✅ Only user and assistant messages: ${hasOnlyUserAndAssistant}`);
  
  console.log('🎉 Test completed successfully!');
}

testFilterUserMessages();
