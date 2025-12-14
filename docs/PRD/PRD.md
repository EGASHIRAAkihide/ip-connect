# プロダクト要件定義書（PRD） — IP Connect (MVP)

_出典: `docs/BRD/BRD.md`_

## 1. 目標
- 「クリエイターがIPを掲載 → 企業がリクエスト → クリエイターが承認 → 記録」というMVPフローを、役割・カタログ閲覧・詳細表示・問い合わせ・簡易アナリティクスまで一貫して提供する。

## 2. ユーザー
- **クリエイター:** 声優/VTuber、イラストレーター、振付師。
- **企業:** 代理店、スタジオ、ブランド、ゲーム/広告/VTuberチーム。
- **内部:** 軽量な管理/オペレーション（ヘルスと不正監視）。

## 3. スコープ（MVP）
- 公開カタログ（タイプフィルタ付き）とIP詳細ページ（プレビュー、価格、terms、メタデータ）。
- クリエイターによるIP作成/編集（asset_type別メタデータ、terms preset/notes、価格レンジ、Supabase Storageアップロード）。
- 構造化された問い合わせ送信と、クリエイター側のステータス更新（pending/approved/rejected）。
- クリエイターダッシュボード（自分のIP一覧、View/Edit、新規作成導線）。
- 簡易アナリティクス（主要件数、ステータス/支払い内訳）。
- 権限/リダイレクト（クリエイター専用編集、未ログイン→ログイン）。

非スコープ: 決済、契約自動生成、DRM/透かし、高度検索/推薦、エンタープライズAPI、通知拡張、多言語UI（英語ベースのみ）。

## 4. 成功指標
- 機能: クリエイターがIPを公開/編集できる。企業が問い合わせ完了まで実行できる。ステータスが保存・表示される。タイプ別メタデータが詳細で表示される。アナリティクスがエラーなく表示される。
- 定量（BRD整合）: クリエイター100人、問い合わせ30件以上、承認率50%以上、定性ヒアリングで肯定的フィードバック。

## 5. エピックと属性
- **E1: カタログ/詳細（企業ビュー）** — Owner: Frontend  
  目標: タイプ別にIPを発見し、正しいプレビューと条件を閲覧できる。  
  受入: `type=voice|choreography|all` フィルタ、voiceはaudioプレビュー、その他はimage/video、メタデータと価格/termsを表示。
- **E2: クリエイターIP作成/編集/メディア** — Owner: Fullstack  
  目標: 必須項目とタイプ別メタデータをもってIPを作成/編集し、Supabaseに保存できる。  
  受入: 必須入力検証、asset_typeごとのメタデータ保存、creator_idチェック、アップロードURL永続化。
- **E3: 問い合わせ/ステータスフロー** — Owner: Backend  
  目標: 構造化問い合わせを作成し、ステータスを管理して監査可能にする。  
  受入: purpose/region/budget/period/messageを保存、ステータス pending/approved/rejected + タイムスタンプ、詳細ページにCTA。
- **E4: クリエイターダッシュボード/ナビ** — Owner: Frontend  
  目標: クリエイターが自分の資産へ即アクセスでき、役割に応じたナビを提供。  
  受入: IP一覧にtype/category/created_at、View/Editリンク、新規作成ショートカット、ロール別ナビ（デスクトップ/モバイル一致）。
- **E5: アナリティクススナップショット** — Owner: Data/Backend  
  目標: 主要件数と内訳をエラーなく可視化。  
  受入: creators/companies/assets/inquiries件数、ステータス・支払い内訳をバー表示（クランプ付き）。
- **E6: アクセス制御/ロール** — Owner: Backend  
  目標: 役割に沿ったアクセス制御とリダイレクトを徹底。  
  受入: クリエイター以外の編集拒否、未ログインはログインへ、プロフィールリンクはログイン時のみ解決。

## 6. Issue候補（エピック別）
- **E1**
  - カタログSSRと`type`クエリフィルタ、空/エラー状態のハンドリング
  - 詳細ページのプレビュー（voice=audio, その他=image/video）と価格/terms/メタ表示
  - タイプ/カテゴリバッジの表示ロジック（振付/声、日本語ラベル整合）
- **E2**
  - 作成/編集フォームの必須検証（title/category/asset_type/file_url）
  - Supabase Storageアップロード + URL永続化（asset_type別accept）
  - 型別メタデータ保存（choreo: bpm/length/style、voice: language/gender/tone）
  - 編集権限チェック（creator_id照合、既存ファイル維持）
- **E3**
  - 「Request License」CTA → 構造化問い合わせ送信（purpose/region/budget/period/message）
  - 問い合わせレコード作成と紐付け（ip_id/creator_id/company_id、デフォルトpending）
  - ステータス更新UI（pending/approved/rejected）＋タイムスタンプ保存（クリエイター向け）
- **E4**
  - ダッシュボード一覧（type/category/created_at、View/Edit導線、件数バッジ、降順ソート）
  - 役割ベースナビ（creator/company/guest）とモバイル/デスクトップ整合
  - 新規作成ショートカット（/creator/ip/new, /creator/voice/new）
- **E5**
  - 件数取得（creators/companies/assets/inquiries）フェイルセーフ0
  - ステータス/支払いステータス棒グラフ（幅クランプ、ラベル、paid_simulated含む）
- **E6**
  - クリエイター専用ページリダイレクト（未ログイン→/auth/login、非creator→/ip）
  - プロフィールリンク解決（ログイン時`/users/{id}`、ゲストはLogin/Register CTA）

## 7. 機能要件
- カタログAPI/クエリは `asset_type` フィルタをサポートし、デフォルトは "all"。
- IP詳細はメタデータ/termsを取得し、欠落時も安全に表示する。
- ファイルはSupabaseバケット `ip-assets` に保存し、`NEXT_PUBLIC_SUPABASE_URL` を用いて公開URLを生成。
- CRUDは認証済みクリエイターに限定し、サーバー側で creator_id を検証。
- 問い合わせステータス遷移は定義済み値のみに限定し、更新ごとにタイムスタンプを保存。
- アナリティクスクエリは失敗時0を返し、UIが落ちない。

## 8. 非機能要件
- パフォーマンス: 公開カタログは可能な限りサーバーレンダー、不要なクライアントフェッチを避ける。
- ユーザビリティ: 空/エラー状態の明示、文言の一貫性、ロール別ナビの明確化。
- セキュリティ/準拠: 基本的なアクセス制御、PIIはemail/id程度、メディアはSupabase Storageに限定。
- 信頼性: 必須環境変数欠如時はユーザー向けエラーメッセージでフェイルセーフ。

## 9. 依存と前提
- Supabase Auth/DB/Storage が利用可能で環境変数が設定されていること。
- `NEXT_PUBLIC_SUPABASE_URL` が存在し、公開URL生成に使えること。
- UIは英語ベース、日本語ラベル（振付/声など）は現行表示を維持。

## 10. 決定事項（Open Questionsの確定）
- 通知: MVPではメール通知を後回しにし、プロダクト内ステータス表示のみ。
- 問い合わせ履歴: 1問い合わせ=1メッセージで十分。スレッド化は後続。
- 価格通貨/最低価格: USDのみ、最小値0（負の値を禁止）。

## 11. マイルストーン（提案）
- Week 1: E2, E6基盤（認可・作成/編集・アップロード・リダイレクト）
- Week 2: E1カタログ/詳細 + E3送信部分
- Week 3: E3ステータス管理 + E4ダッシュボード/ナビ仕上げ
- Week 4: E5アナリティクス安定化、QA、PoCオンボーディング

## 12. 実行計画（Issue化用）
- 優先度: E2 → E1 → E3 → E4 → E6 → E5
- マイルストーン割当: Week1(E2,E6)、Week2(E1,E3送信)、Week3(E3ステータス,E4)、Week4(E5, QA)

| Epic | Issue | Owner | Milestone | 備考 |
| --- | --- | --- | --- | --- |
| E2 | 作成/編集フォーム必須項目バリデーション（title/category/asset_type/file_url） | FS | Week 1 | クリエイターCRUDの基盤 |
| E2 | Supabase StorageアップロードとURL永続化（asset_type別accept） | FS | Week 1 | バケット`ip-assets` |
| E2 | 型別メタデータ保存（choreo: bpm/length/style、voice: language/gender/tone） | FS | Week 1 | 保存と表示を担保 |
| E2 | 編集時権限チェック（creator_id照合、既存ファイル維持） | FS | Week 1 | ガード/リダイレクト |
| E1 | カタログSSR + `type`フィルタ、空/エラー状態 | FE | Week 2 | デフォルトall |
| E1 | 詳細プレビュー（voice=audio, その他=image/video）と価格/terms/メタ表示 | FE | Week 2 | フォールバック安全 |
| E1 | タイプ/カテゴリバッジ表示（振付/声、日本語ラベル） | FE | Week 2 | 一貫表示 |
| E3 | “Request License” → 構造化問い合わせ送信 | BE | Week 2 | purpose/region/budget/period/message |
| E3 | 問い合わせレコード作成と紐付け（ip/creator/company、pending初期化） | BE | Week 2 | ステータス初期値 |
| E3 | ステータス更新UI（pending/approved/rejected）＋タイムスタンプ | BE | Week 3 | クリエイター向け |
| E4 | ダッシュボード一覧（type/category/created_at、導線、バッジ） | FE | Week 3 | 降順ソート |
| E4 | 役割ベースナビ（creator/company/guest、モバイル/デスクトップ） | FE | Week 3 | MainNav系 |
| E4 | 新規作成ショートカット（/creator/ip/new, /creator/voice/new） | FE | Week 3 | ボタン/リンク |
| E6 | クリエイター専用ページリダイレクト（未ログイン→/auth/login、非creator→/ip） | BE | Week 1 | ルートガード |
| E6 | プロフィールリンク解決（ログイン時`/users/{id}`、ゲストはCTA） | FE | Week 1 | ナビ整合 |
| E5 | 集計取得（creators/companies/assets/inquiries）フェイルセーフ0 | BE | Week 4 | サイレント失敗 |
| E5 | ステータス/支払いステータス棒グラフ（幅クランプ、ラベル） | FE | Week 4 | paid_simulated含む |
