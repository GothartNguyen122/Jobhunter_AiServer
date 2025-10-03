# OpenAI Node.js Example

This project demonstrates how to use the OpenAI API with Node.js, converted from the Python example.

## Features

- Uses OpenAI's official Node.js SDK
- Environment variable configuration for API key and system prompt
- Interactive terminal chat interface
- Simple one-time API call example
- Conversation history management
- Customizable system prompts
- Error handling
- Multiple chat commands (help, clear, history, exit)

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. Navigate to the project directory:
```bash
cd openai-nodejs
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp env.template .env
```

2. Edit the `.env` file and add your OpenAI API key and system prompt:
```
OPENAI_API_KEY=your_actual_api_key_here
SYSTEM_PROMPT=Your custom system prompt here
```

## Usage

### Terminal Chat (Interactive)
For an interactive terminal chat experience:
```bash
npm run chat
```

Or directly with Node.js:
```bash
node terminal-chat.js
```

### Simple API Call
For a simple one-time API call:
```bash
npm start
```

Or directly with Node.js:
```bash
node index.js
```

## Terminal Chat Commands

When using the interactive terminal chat (`npm run chat`), you have access to these commands:

- `help` - Show available commands
- `clear` - Clear conversation history
- `history` - Display conversation history
- `exit`, `quit`, or `bye` - End the conversation
- Any other text - Send message to AI

## Environment Variables

The following environment variables can be configured in your `.env` file:

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `SYSTEM_PROMPT` - Custom system prompt for AI behavior (optional)

Other parameters are hard-coded:
- Model: `gpt-4o-mini`
- Max tokens: `1000`
- Temperature: `0.7`

## Code Explanation

The Node.js code is equivalent to the Python version:

### Python Version:
```python
import openai
from dotenv import load_dotenv
import os
load_dotenv()

api_key = os.getenv("OPEN_API_KEY")
client=openai.OpenAI( api_key = api_key)
reponses = client.chat.completions.create(
    model = "gpt-4.1-nano",
    messages = [
        {"role" : "user","content": "Hello How are you!"}
    ],
)
print(reponses.choices[0].message.content)
```

### Node.js Version:
```javascript
const OpenAI = require('openai');
require('dotenv').config();

const apiKey = process.env.OPEN_API_KEY;
const client = new OpenAI({ apiKey: apiKey });

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "user", content: "Hello How are you!" }
  ]
});

console.log(response.choices[0].message.content);
```

## Key Differences

1. **Import statements**: `require()` instead of `import`
2. **Environment variables**: `process.env` instead of `os.getenv()`
3. **Async/await**: Node.js version uses async/await for API calls
4. **Model name**: Updated to use `gpt-4o-mini` (gpt-4.1-nano doesn't exist)
5. **Error handling**: Added try-catch for better error management

## Dependencies

- `openai`: Official OpenAI Node.js SDK
- `dotenv`: For loading environment variables from .env file

## Troubleshooting

- Make sure your API key is valid and has sufficient credits
- Check that the `.env` file is in the same directory as `index.js`
- Ensure all dependencies are installed with `npm install`
