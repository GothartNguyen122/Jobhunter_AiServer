/**
 * Test filterValidMessages function
 */

const { filterValidMessages } = require('./utils/validation');

function testFilterValidMessages() {
  console.log('🧪 Testing filterValidMessages function...');
  
  // Test with valid messages
  const validMessages = [
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
    }
  ];
  
  console.log('✅ Valid messages:', JSON.stringify(validMessages, null, 2));
  const filteredValid = filterValidMessages(validMessages);
  console.log('✅ Filtered valid messages:', JSON.stringify(filteredValid, null, 2));
  
  // Test with invalid messages
  const invalidMessages = [
    {
      role: 'system',
      content: undefined
    },
    {
      role: 'user',
      content: 'Hello'
    },
    {
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'test', type: 'function' }]
    }
  ];
  
  console.log('❌ Invalid messages:', JSON.stringify(invalidMessages, null, 2));
  const filteredInvalid = filterValidMessages(invalidMessages);
  console.log('✅ Filtered invalid messages:', JSON.stringify(filteredInvalid, null, 2));
  
  console.log('🎉 Test completed successfully!');
}

testFilterValidMessages();
