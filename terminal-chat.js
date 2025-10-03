const OpenAI = require('openai');
const readline = require('readline');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get system prompt from environment variable
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT 
// Create readline interface for terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Store conversation history
let conversationHistory = [
  {
    role: 'system',
    content: SYSTEM_PROMPT
  }
];

// Function to get AI response
async function getAIResponse(userMessage) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Get AI response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationHistory,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    
    // Add AI response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    return aiResponse;
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error.message);
    return 'Sorry, I encountered an error while processing your request.';
  }
}

// Function to display welcome message
function displayWelcome() {
  console.log('\n🤖 AI Assistant Terminal Chat');
  console.log('================================');
  console.log('Type your message and press Enter to chat with the AI.');
  console.log('Type "exit", "quit", or "bye" to end the conversation.');
  console.log('Type "clear" to clear conversation history.');
  console.log('Type "help" for more commands.\n');
}

// Function to display help
function displayHelp() {
  console.log('\n📋 Available Commands:');
  console.log('• exit, quit, bye - End the conversation');
  console.log('• clear - Clear conversation history');
  console.log('• help - Show this help message');
  console.log('• history - Show conversation history');
  console.log('• Any other text - Send message to AI\n');
}

// Function to display conversation history
function displayHistory() {
  console.log('\n📜 Conversation History:');
  console.log('=======================');
  conversationHistory.forEach((message, index) => {
    if (message.role !== 'system') {
      const role = message.role === 'user' ? '👤 You' : '🤖 AI';
      console.log(`${index}. ${role}: ${message.content}`);
    }
  });
  console.log('=======================\n');
}

// Function to clear conversation history
function clearHistory() {
  conversationHistory = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    }
  ];
  console.log('✅ Conversation history cleared.\n');
}

// Function to handle user input
async function handleInput(input) {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return;
  }

  // Handle special commands
  switch (trimmedInput.toLowerCase()) {
    case 'exit':
    case 'quit':
    case 'bye':
      console.log('\n👋 Goodbye! Thanks for chatting!');
      rl.close();
      return;
    
    case 'clear':
      clearHistory();
      return;
    
    case 'help':
      displayHelp();
      return;
    
    case 'history':
      displayHistory();
      return;
  }

  // Show user message
  console.log(`\n👤 You: ${trimmedInput}`);
  
  // Show typing indicator
  process.stdout.write('🤖 AI: ');
  
  // Get AI response
  const response = await getAIResponse(trimmedInput);
  
  // Clear the typing indicator line and show response
  process.stdout.write('\r🤖 AI: ' + response + '\n\n');
}

// Function to start the chat
function startChat() {
  displayWelcome();
  
  // Ask for first input
  rl.question('👤 You: ', async (input) => {
    await handleInput(input);
    
    // Continue asking for input if not exiting
    if (input.toLowerCase() !== 'exit' && 
        input.toLowerCase() !== 'quit' && 
        input.toLowerCase() !== 'bye') {
      askForInput();
    }
  });
}

// Function to ask for next input
function askForInput() {
  rl.question('👤 You: ', async (input) => {
    await handleInput(input);
    
    // Continue asking for input if not exiting
    if (input.toLowerCase() !== 'exit' && 
        input.toLowerCase() !== 'quit' && 
        input.toLowerCase() !== 'bye') {
      askForInput();
    }
  });
}

// Check if API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in environment variables.');
  console.error('Please set your OpenAI API key in the .env file.');
  process.exit(1);
}

// Start the chat
startChat();

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye! Thanks for chatting!');
  rl.close();
  process.exit(0);
});
