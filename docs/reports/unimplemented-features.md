# PRD実行計画 未実装機能レポート

対象: `docs/PRD/PRD.md` の実行計画に対し、現コードに未実装・未達成の機能を洗い出しました。

## 未実装・未達成と確認した項目

- **E2: 編集時権限チェック（creator_id照合、既存ファイル維持）**
  - 現状は新規作成のみ実装で、編集ルート/フォーム/サーバー処理が存在しません。`app/creator/dashboard/page.tsx:111-119` で Edit リンクを出していますが、`app/creator/ip/[id]/edit` 配下のページや API が見当たらず 404 になります。
  - そのため既存ファイルの維持や creator_id による編集ガードも実現できていません。

- **E3: “Request License” → 構造化問い合わせ送信（purpose/region/budget/period/message）**
  - フロント/サーバーともに `usage_purpose`/`usage_media`/`usage_period` を使っており、PRDで必須の `region` が入力・保存できません。また保存フィールドが `purpose`/`region`/`period` と不整合なため、表示側が空のままになります。
    - 入力/送信: `app/ip/[id]/inquire/page.tsx:17-149`（regionフィールドなし）、`app/ip/[id]/inquire/actions.ts:16-35`（usage_* カラムへ保存）。
    - 表示: `app/creator/inquiries/[id]/page.tsx:10-218` や `app/company/inquiries/[id]/page.tsx:143-210` は `purpose`/`region`/`period` を読むため、値が欠落します。

- **E6: クリエイター専用ページリダイレクト（未ログイン→/auth/login、非creator→/ip）**
  - 問い合わせ一覧/詳細はログインしていない場合にメッセージ表示のみでリダイレクトしません。またユーザーの role チェックもなく、PRDの「非creatorは/ipへ」のガードが未実装です。
    - 一覧: `app/creator/inquiries/page.tsx:44-82`（未ログイン時にメッセージのみ、role判定なし）。
    - 詳細: `app/creator/inquiries/[id]/page.tsx:41-128`（未ログイン時メッセージのみ、role判定なし。asset所有者照合はあるが creator role ではない）。

## 備考
- カタログSSR/フィルタ、IP詳細プレビュー、アナリティクス集計・棒グラフ、ロール別ナビ、問い合わせステータス更新UIなど、他の実行計画項目はコード上で実装を確認しました。
