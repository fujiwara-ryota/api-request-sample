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
  let count = null; // デフォルトはnull（全件処理）

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
 * OpenAI APIにリクエストを送信する（単一バッチ）
 */
async function sendBatchToAPI(data, batchNumber, totalBatches) {
  try {
    console.log(`\n[Batch ${batchNumber}/${totalBatches}] Sending ${data.length} items to OpenAI API...`);

    // 実行時間計測開始
    const startTime = Date.now();

    // データをJSON文字列に変換してメッセージとして送信
    const inputText = JSON.stringify(data, null, 2);

    const response = await openai.responses.create({
      prompt: {
        "id": process.env.PROMPT_ID,
        "version": "25"
      },
      input: [
        {
          "type": "message",
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": inputText
            }
          ]
        }
      ],
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

    // 実行時間計測終了
    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`[Batch ${batchNumber}/${totalBatches}] Completed successfully (${executionTime}s)`);
    return response;
  } catch (error) {
    console.error(`[Batch ${batchNumber}/${totalBatches}] Error:`, error);
    throw error;
  }
}

/**
 * データを100件ずつに分割してAPIリクエストを実行し、レスポンスを結合する
 */
async function sendToAPI(data) {
  const BATCH_SIZE = 100;
  const batches = [];

  // データを100件ずつに分割
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    batches.push(data.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n=== Processing ${data.length} items in ${batches.length} batches (${BATCH_SIZE} items per batch) ===`);

  const allResponses = [];
  const totalStartTime = Date.now();

  // 各バッチを順次処理
  for (let i = 0; i < batches.length; i++) {
    const response = await sendBatchToAPI(batches[i], i + 1, batches.length);
    allResponses.push(response);

    // API制限を考慮して少し待機（最後のバッチ以外）
    if (i < batches.length - 1) {
      console.log('Waiting 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const totalEndTime = Date.now();
  const totalExecutionTime = ((totalEndTime - totalStartTime) / 1000).toFixed(2);

  console.log(`\n=== Total API execution time: ${totalExecutionTime}s ===`);

  // レスポンスを結合
  console.log('\n=== Merging responses ===');
  const mergedResponse = mergeResponses(allResponses);

  return mergedResponse;
}

/**
 * 複数のレスポンスを結合する
 */
function mergeResponses(responses) {
  if (responses.length === 0) {
    throw new Error('No responses to merge');
  }

  if (responses.length === 1) {
    return responses[0];
  }

  // 最初のレスポンスをベースにする
  const merged = JSON.parse(JSON.stringify(responses[0]));

  // 各レスポンスのoutput[].content[].textを結合
  const allTexts = [];

  for (const response of responses) {
    if (response.output && Array.isArray(response.output)) {
      response.output.forEach((outputItem) => {
        if (outputItem.content && Array.isArray(outputItem.content)) {
          outputItem.content.forEach((contentItem) => {
            if (contentItem.text) {
              // コードフェンスを削除してテキストを抽出
              let text = contentItem.text.trim();
              text = text.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
              if (text) {
                allTexts.push(text);
              }
            }
          });
        }
      });
    }
  }

  // 結合されたテキストを新しいoutputとして設定
  const mergedText = allTexts.join('\n');

  if (merged.output && merged.output.length > 0 && merged.output[0].content && merged.output[0].content.length > 0) {
    merged.output[0].content[0].text = '```\n' + mergedText + '\n```';
  }

  // usageを合算
  if (merged.usage) {
    merged.usage.input_tokens = responses.reduce((sum, r) => sum + (r.usage?.input_tokens || 0), 0);
    merged.usage.output_tokens = responses.reduce((sum, r) => sum + (r.usage?.output_tokens || 0), 0);
    merged.usage.total_tokens = responses.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0);

    if (merged.usage.input_tokens_details) {
      merged.usage.input_tokens_details.cached_tokens = responses.reduce((sum, r) => sum + (r.usage?.input_tokens_details?.cached_tokens || 0), 0);
    }
    if (merged.usage.output_tokens_details) {
      merged.usage.output_tokens_details.reasoning_tokens = responses.reduce((sum, r) => sum + (r.usage?.output_tokens_details?.reasoning_tokens || 0), 0);
    }
  }

  // output_textも更新
  if (merged.output_text !== undefined) {
    merged.output_text = '```\n' + mergedText + '\n```';
  }

  console.log(`Merged ${responses.length} responses into one`);
  console.log(`Total output lines: ${mergedText.split('\n').length}`);

  return merged;
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

    // JSONファイルとして保存
    const jsonFilename = `result_${count}items_${timestamp}.json`;
    const jsonFilePath = path.join(outputDir, jsonFilename);
    fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`JSON result saved to: ${jsonFilePath}`);

    // output配列からtextを抽出してCSVとして保存
    if (result.output && Array.isArray(result.output)) {
      let csvContent = '';
      result.output.forEach((outputItem) => {
        if (outputItem.content && Array.isArray(outputItem.content)) {
          outputItem.content.forEach((contentItem) => {
            if (contentItem.text) {
              // コードフェンスを削除
              let text = contentItem.text.trim();
              text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
              csvContent += text + '\n';
            }
          });
        }
      });

      if (csvContent) {
        const csvFilename = `result_${count}items_${timestamp}.csv`;
        const csvFilePath = path.join(outputDir, csvFilename);
        fs.writeFileSync(csvFilePath, csvContent.trim(), 'utf8');
        console.log(`CSV result saved to: ${csvFilePath}`);
      }
    }
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
    if (count === null) {
      console.log('Requested count: All items');
    } else {
      console.log(`Requested count: ${count}`);
    }

    // 全データを読み込み
    const allData = await loadAllData();

    // 指定された件数分を取得（countがnullの場合は全件）
    const dataToProcess = count === null ? allData : allData.slice(0, count);

    if (dataToProcess.length === 0) {
      console.error('No data to process');
      process.exit(1);
    }

    if (count !== null && dataToProcess.length < count) {
      console.warn(`Warning: Only ${dataToProcess.length} items available (requested ${count})`);
    }

    console.log(`Processing ${dataToProcess.length} items...`);

    // APIに送信
    const result = await sendToAPI(dataToProcess);

    // 結果を表示
    console.log('\n=== API Response ===');

    // outputからtextを抽出して表示
    if (result.output && Array.isArray(result.output)) {
      result.output.forEach((outputItem, index) => {
        if (outputItem.content && Array.isArray(outputItem.content)) {
          outputItem.content.forEach((contentItem) => {
            if (contentItem.text) {
              console.log(`\n--- Output ${index + 1} ---`);
              // textを改行で分割して表示
              const lines = contentItem.text.split('\n');
              lines.forEach(line => {
                console.log(line);
              });
            }
          });
        }
      });
    }

    console.log('\n=== Full Response (JSON) ===');
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
