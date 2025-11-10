const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: ""// Thay bằng API key thật của bạn
  });

async function runEvalWithInput(evalId, inputText) {
    try {
      const runResult = await openai.evals.create({
        eval_id: evalId,
        model: "o3-mini",
        input: inputText
      });
  
      console.log("Kết quả Eval Run:");
      console.log(runResult);
    } catch (err) {
      console.error("Lỗi khi chạy eval:", err);
    }
  }

// Ví dụ test
const evalId = "eval_690fff0749cc8191bb495075f7304529"; // thay bằng eval ID của bạn
const inputText = "I am really happy today!";
runEvalWithInput(evalId, inputText);
