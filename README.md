# api-request-sample

OpenAI APIを使用してリクエストを送信するサンプルプロジェクトです。

## セットアップ

1. 依存関係をインストールします：
```bash
npm install
```

2. `.env.example`を`.env`にコピーして、環境変数を設定します：
```bash
cp .env.example .env
```

3. `.env`ファイルを編集して、実際のOpenAI API, PROMPT_IDを設定します：
```
OPENAI_API_KEY=your_actual_openai_api_key_here
PROMPT_ID=pmpt_xxxxxxxx
```

## 使用方法

アプリケーションを実行します：
```bash
npm start
```

または開発モードで実行（ファイル変更時に自動再起動）：
```bash
npm run dev
```

## ファイル構成

- `index.js` - メインのアプリケーションファイル
- `.env` - 環境変数設定ファイル（APIキーなど）
- `.env.example` - 環境変数のテンプレートファイル
- `package.json` - プロジェクト設定と依存関係

## 注意事項

- `.env`ファイルにはAPIキーが含まれているため、Gitにコミットしないでください
- OpenAI APIキーは適切に管理し、公開しないでください
