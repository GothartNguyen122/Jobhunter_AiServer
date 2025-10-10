const axios = require('axios');

const AI_SERVER_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing AI Server API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${AI_SERVER_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.message);
    console.log('');

    // Test 2: Chat API
    console.log('2️⃣ Testing Chat API...');
    const chatResponse = await axios.post(`${AI_SERVER_URL}/api/v1/AiServer`, {
      message: 'Tôi muốn tìm việc làm lập trình viên',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Chat Response:', chatResponse.data.message);
    console.log('');

    // Test 3: Chat History
    console.log('3️⃣ Testing Chat History...');
    const historyResponse = await axios.get(`${AI_SERVER_URL}/api/v1/AiServer/history`);
    console.log('✅ Chat History:', historyResponse.data.data.length, 'messages');
    console.log('');

    // Test 4: Another Chat Message
    console.log('4️⃣ Testing Another Chat Message...');
    const chatResponse2 = await axios.post(`${AI_SERVER_URL}/api/v1/AiServer`, {
      message: 'Tư vấn viết CV như thế nào?',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Second Chat Response:', chatResponse2.data.message);
    console.log('');

    // Test 5: Final History Check
    console.log('5️⃣ Testing Final History...');
    const finalHistoryResponse = await axios.get(`${AI_SERVER_URL}/api/v1/AiServer/history`);
    console.log('✅ Final History:', finalHistoryResponse.data.data.length, 'messages');
    console.log('');

    console.log('🎉 All tests passed! AI Server is working correctly.');
    console.log('\n📋 Summary:');
    console.log('- Health check: ✅');
    console.log('- Chat API: ✅');
    console.log('- History API: ✅');
    console.log('- Multiple messages: ✅');
    console.log('\n🚀 Ready to integrate with Frontend!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure AI Server is running:');
      console.log('   cd Jobhunter_AiServer/Jobhunter_AiServer');
      console.log('   npm install');
      console.log('   npm start');
    }
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run tests
testAPI();
