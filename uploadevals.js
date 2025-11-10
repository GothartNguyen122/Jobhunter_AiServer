import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
    apiKey: "" // Thay bằng API key thật của bạn
  });
async function uploadFile() {
  const resp = await openai.files.create({
    file: fs.createReadStream("samples.jsonl"),
    purpose: "evals"  // ✅ sửa từ "eval" → "evals"
  });
  console.log("File uploaded, file_id:", resp.id);
}

uploadFile();
