const OpenAI = require('openai');
require('dotenv').config();

// Get API key from environment variables
const apiKey = process.env.OPEN_API_KEY;

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: apiKey
});

async function main() {
  try {
    // Create chat completion
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Note: gpt-4.1-nano doesn't exist, using gpt-4o-mini instead
      messages: [
        {
          role: "user",
          content: "Hello How are you!"
        }
      ]
    });

    // Print the response content
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message);
  }
}

// Run the main function
main();
