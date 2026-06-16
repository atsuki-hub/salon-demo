# Salon Project Initializer

新規クライアント案件をゼロから立ち上げます。
このリポジトリをテンプレートとして、新しいプロジェクトを作成します。

## 使い方
```
/salon-init [プロジェクトディレクトリ名]
```

例: `/salon-init hairsalon-sakura`

## 実行手順

### STEP 1: 前提確認

以下を確認:
- [ ] `git` が使える
- [ ] 作業ディレクトリが salon-demo リポジトリ内にある
- [ ] 親ディレクトリに書き込み権限がある

### STEP 2: 新プロジェクトのセットアップ

```bash
# 親ディレクトリに移動して新しいディレクトリを作成
cd ..
cp -r salon-demo 【プロジェクト名】
cd 【プロジェクト名】
git init
git add -A
git commit -m "init: salon-demo テンプレートから初期化"
```

### STEP 3: クライアント情報の収集

AskUserQuestion で以下を収集:
1. サロン名（英語表記）: GitHubリポジトリ名に使用
2. サロン名（日本語表記）: サイト表示名
3. 業種: 美容室 / リラクゼーション / ネイル / エステ
4. ブランドカラー: 16進コードまたは色の方向性
5. スタッフ数: 1〜10名

### STEP 4: 初期カスタマイズ

`/salon-customize` の STEP 3 を実行して基本設定を更新。

### STEP 5: README の生成

以下の内容で `README.md` を更新（または新規作成）:

```markdown
# 【サロン名】- 予約・経営管理システム デモ

## 概要
【サロン名】向けの予約・経営ダッシュボードのデモシステムです。

## ページ構成
- `index.html` — 経営ダッシュボード（オーナー向け）
- `reservations.html` — 予約管理（スタッフ向け）
- `book.html` — 顧客向け予約フォーム

## 技術スタック
- HTML5 / CSS3 / Vanilla JavaScript
- Chart.js 4.4.1

## ローカル起動
ブラウザで `index.html` を開くだけで動作します。

## ⚠️ デモ注意事項
- サンプルデータのみ使用（本番データなし）
- データはページリロードでリセットされます

---
作成日: 【今日の日付】
```

### STEP 6: .gitignore の確認

`.gitignore` が存在しない場合は作成:
```
.DS_Store
*.log
node_modules/
proposal-*.md
```

### STEP 7: 初期コミット

```bash
git add -A
git commit -m "customize: 【サロン名】向け初期カスタマイズ完了"
```

### STEP 8: GitHub リポジトリのセットアップ案内

```
✅ プロジェクト初期化完了!

📁 プロジェクト: 【ディレクトリ名】/

次のステップ（手動で実施）:
1. GitHub で新規リポジトリを作成
   → https://github.com/new
   → リポジトリ名: 【プロジェクト名】
   → Private（クライアント案件は非公開推奨）

2. リモートを追加してプッシュ:
   git remote add origin https://github.com/【ユーザー名】/【プロジェクト名】.git
   git push -u origin main

3. GitHub Pages でデモ公開（任意）:
   Settings → Pages → Branch: main / root

4. クライアントにデモURLを共有したら:
   /salon-propose 【クライアント名】 で提案書を生成

5. フィードバック後:
   /salon-loop でさらに品質改善
```

## 副業フロー全体像

```
新規案件
  ↓
/salon-init [client-name]     ← プロジェクト立ち上げ (30分)
  ↓
/salon-customize [client]     ← デモカスタマイズ (1〜2時間)
  ↓
/salon-audit                  ← 品質確認 (15分)
  ↓
クライアントにデモを見せる
  ↓
/salon-propose [client]       ← 提案書・見積もり生成 (15分)
  ↓
受注・開発開始
  ↓
/salon-loop 6                 ← 改善ループ (適宜)
  ↓
納品
```
