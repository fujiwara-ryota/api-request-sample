# OpenAI API Request Sample

dataディレクトリの配列形式JSONファイルからデータを読み込み、指定した件数分をOpenAI APIに送信するサンプルアプリケーションです。

## セットアップ

1. 依存関係をインストール：
```bash
npm install
```

2. 環境変数を設定：
```bash
cp .env.example .env
```

3. `.env`ファイルでOpenAI APIキーとPrompt IDを設定：
```
OPENAI_API_KEY=your-actual-api-key-here
PROMPT_ID=pmpt_68ef29b2ef6c8195abc3b119a63909760649e17365f76136
```

## データ形式

dataディレクトリには、以下の形式の配列JSONファイルを配置してください：

```json
[
  {
    "id": 1,
    "text": "質問テキスト",
    "category": "カテゴリ"
  },
  {
    "id": 2,
    "text": "別の質問テキスト",
    "category": "別のカテゴリ"
  }
]
```

## 使用方法

### 全件実行（デフォルト）
```bash
node index.js
```
`--count`オプションを指定しない場合、dataディレクトリの全JSONファイルから全件のデータを読み込み、APIに送信します。

### 件数を指定して実行
```bash
node index.js --count=100
```

このコマンドで、dataディレクトリの全JSONファイルから最大100件のデータを読み込み、APIに送信します。

### 開発モード（ファイル監視）
```bash
npm run dev
```

## 機能

- dataディレクトリの全`.json`ファイルを自動読み込み
- 配列形式のJSONデータを結合
- コマンドライン引数での件数指定
- 指定件数分のデータをOpenAI responses.create APIに送信
- 配列データのtextフィールドを質問として使用
- レスポンスの画面表示とファイル保存
- outputディレクトリへの結果保存（タイムスタンプ付き）

## 出力

APIのレスポンスは以下の場所に保存されます：
- `output/result_{件数}items_{タイムスタンプ}.txt`

## サンプルデータ

プロジェクトには以下のサンプルファイルが含まれています：
- `data/data_1.json` - 文化、プログラミング、技術などの質問
- `data/data_2.json` - 旅行、ビジネス、環境などの質問

## 注意事項

- OpenAI APIキーが必要です
- API使用料金が発生する可能性があります
- 大量のデータを送信する際は、APIの利用制限にご注意ください
