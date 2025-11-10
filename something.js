// import OpenAI from "openai";
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// --- Khởi tạo client ---
const openai = new OpenAI({
  apiKey: "" // Thay bằng API key thật của bạn
});

// --- Dữ liệu mẫu ---
const samples = [
  { input: "I love this!", expected: "positive" },
  { input: "It's okay.", expected: "neutral" },
  { input: "I hate it.", expected: "negative" }
];

async function runEval() {
  try {
    // --- Bước 1: Upload file samples.jsonl ---
    console.log("--- Step 1: Uploading file ---\n");
    // const filePath = path.join(__dirname, 'samples.jsonl');
    
    // // Đảm bảo file tồn tại, nếu không thì tạo từ samples
    // if (!fs.existsSync(filePath)) {
    //   const jsonlContent = samples.map(s => JSON.stringify(s)).join('\n');
    //   fs.writeFileSync(filePath, jsonlContent);
    //   console.log("Created samples.jsonl file");
    // }
    
    // const file = await openai.files.create({
    //   file: fs.createReadStream(filePath),
    //   purpose: "evals"
    // });
    
    // console.log("✅ File uploaded successfully!");
    // console.log("File ID:", file.id);
    // console.log("\n");
    
    // --- Bước 2: Tạo Eval với custom data source ---
    console.log("--- Step 2: Creating Eval ---\n");
    
    const evalObj = await openai.evals.create({
      name: "SentimentExample",
      data_source_config: {
        type: "custom",
        item_schema: {
          type: "object",
          properties: {
            input: { type: "string" },
            expected: { type: "string" }
          },
          required: ["input", "expected"]
        }
      },
      testing_criteria: [
        {
          name: "Sentiment grader",
          type: "label_model",
          model: "o3-mini",
          input: [
            {
              role: "developer",
              content: "Classify the sentiment of the following statement as one of 'positive', 'neutral', or 'negative'"
            },
            {
              role: "user",
              content: "Statement: {{item.input}}"
            }
          ],
          passing_labels: ["positive", "neutral", "negative"],
          labels: ["positive", "neutral", "negative"]
        }
      ]
    });
    
    console.log("✅ Eval Created:");
    console.log("Eval ID:", evalObj.id);
    console.log("Eval Name:", evalObj.name);
    console.log("Eval:", evalObj);
    if (evalObj.dashboard_url) {
      console.log("Dashboard URL:", evalObj.dashboard_url);
    }
    console.log("\n");

    // // --- Chạy Eval trên từng sample ---
    // console.log("\n--- Running Eval on samples ---\n");

    // for (const sample of samples) {
    //   // Giả lập grader bằng cách gọi model trực tiếp (thay vì Eval server-side)
    //   const response = await openai.chat.completions.create({
    //     model: "o3-mini",
    //     messages: [
    //       {
    //         role: "system",
    //         content:
    //           "Classify the sentiment of the following statement as one of 'positive', 'neutral', or 'negative'. Only respond with one word."
    //       },
    //       {
    //         role: "user",
    //         content: sample.input
    //       }
    //     ]
    //   });

    //   const sentiment = response.choices[0].message.content.trim();
    //   const pass = sentiment === sample.expected ? "PASS" : "FAIL";

    //   console.log(`Input: "${sample.input}"`);
    //   console.log(`Expected: "${sample.expected}" | Model: "${sentiment}" | Result: ${pass}`);
    //   console.log("-------------------------------------------------");
    // }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

runEval();
