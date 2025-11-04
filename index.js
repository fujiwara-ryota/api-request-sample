import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 環境変数を読み込み
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * dataディレクトリの全JSONファイルを読み込んで配列データを結合する
 */
async function loadAllData() {
  const dataDir = './data';
  const allData = [];

  try {
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      if (Array.isArray(jsonData)) {
        allData.push(...jsonData);
      } else {
        console.warn(`Warning: ${file} is not an array format`);
      }
    }

    console.log(`Loaded ${allData.length} total items from ${files.length} files`);
    return allData;
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  }
}

/**
 * コマンドライン引数を解析する
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let count = 10; // デフォルト値

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.split('=')[1]);
      if (isNaN(count) || count <= 0) {
        console.error('Error: count must be a positive number');
        process.exit(1);
      }
    }
  }

  return { count };
}

/**
 * OpenAI APIにリクエストを送信する
 */
async function sendToAPI(data) {
  try {
    console.log(`Sending ${data.length} items to OpenAI API...`);
    console.log('Data preview:', data.slice(0, 2));

    const response = await openai.responses.create({
      prompt: {
        "id": process.env.PROMPT_ID,
        "version": "25"
      },
      input: JSON.stringify(data),
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

    return response;
  } catch (error) {
    console.error('Error sending request to OpenAI:', error);
    throw error;
  }
}

/**
 * 結果をファイルに保存する
 */
function saveResult(result, count) {
  try {
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `result_${count}items_${timestamp}.json`;
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Result saved to: ${filePath}`);
  } catch (error) {
    console.error('Error saving result:', error);
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('OpenAI API Request Sample');
    console.log('========================');

    // 環境変数の確認
    if (!process.env.OPENAI_API_KEY) {
      console.error('Error: OPENAI_API_KEY is not set in .env file');
      process.exit(1);
    }

    if (!process.env.PROMPT_ID) {
      console.error('Error: PROMPT_ID is not set in .env file');
      process.exit(1);
    }


    // コマンドライン引数を解析
    const { count } = parseArgs();
    console.log(`Requested count: ${count}`);

    // 全データを読み込み
    const allData = await loadAllData();

    // 指定された件数分を取得
    const dataToProcess = allData.slice(0, count);
    console.log(dataToProcess);

    if (dataToProcess.length === 0) {
      console.error('No data to process');
      process.exit(1);
    }

    if (dataToProcess.length < count) {
      console.warn(`Warning: Only ${dataToProcess.length} items available (requested ${count})`);
    }

    console.log(`Processing ${dataToProcess.length} items...`);

    // APIに送信
    const result = await sendToAPI(dataToProcess);

    // 結果を表示
    console.log('\n=== API Response ===');
    console.log(JSON.stringify(result, null, 2));

    // 結果をファイルに保存
    saveResult(result, dataToProcess.length);

    console.log('\nProcess completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
