# Codex運用ルール（IP Connect）

## 共通原則
- 1リクエスト = 1タスクのみ対応
- 複数タスクを混在させない
- 変更ファイルを最初に宣言し、最後に差分のみ出力
- 不要な説明文・背景解説は禁止（箇条書きのみ）
- 既存の /lab, /apps/ai 実装は参照可だが、原則変更しない
- 音声・PDF・未指示領域には触れない
- UIは既存の Tailwind / shadcn 構造を崩さない
- 断定的・法的表現は禁止（盗用・違法 等）

## 技術前提
- Next.js App Router
- Supabase (PostgreSQL + Storage + RLS)
- Server Actions / Route Handlers を用途に応じて使い分け
- service_role は更新系のみで使用
- company / creator / admin の role を厳密に分離

## 出力ルール
- 実装後に以下を必ず明示する:
  - 変更ファイル一覧
  - 追加/修正した主要ロジック
  - pnpm lint / pnpm build が通る想定か

## 優先順位
1. ビルドが通ること
2. セキュリティ・権限逸脱がないこと
3. UIが壊れないこと
4. 実装量よりも差分の明確さ
