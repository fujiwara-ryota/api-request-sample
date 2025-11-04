import OpenAI from "openai";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

// OpenAIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createResponse() {
  try {
    console.log("OpenAI APIにリクエストを送信中...");

    const response = await openai.responses.create({
      prompt: {
        "id": process.env.PROMPT_ID,
        "version": "25"
      },
      input: [],
      text: {
        "format": {
          "type": "text"
        }
      },
      reasoning: {},
      max_output_tokens: 16384,
      store: false,
      include: ["web_search_call.action.sources"]
    });

    console.log("レスポンスを受信しました:");
    console.log(JSON.stringify(response, null, 2));

    return response;
  } catch (error) {
    console.error("エラーが発生しました:", error.message);
    if (error.status) {
      console.error("ステータスコード:", error.status);
    }
    throw error;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  createResponse()
    .then(() => {
      console.log("処理が完了しました。");
    })
    .catch((error) => {
      console.error("処理中にエラーが発生しました:", error);
      process.exit(1);
    });
}

export { createResponse };
