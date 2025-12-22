import Link from "next/link";
import { requireLabAdmin } from "@/lib/lab";

const steps = [
  {
    title: "Step1: ASR 基盤",
    purpose: "Whisperによる文字起こしとイベント計測のPoC",
    routes: ["/lab/audio/asr", "/lab/runs/[id]"],
    endpoints: ["/asr"],
    db: ["lab_runs 追加", "storage bucket lab-inputs"],
    verify: "音声アップ→文字起こし結果が lab_runs に保存され、詳細で確認",
  },
  {
    title: "Step2: Diarization",
    purpose: "話者分離でセグメントに話者ラベルを付与",
    routes: ["/lab/audio/diarize"],
    endpoints: ["/diarize"],
    db: ["lab_runs.type に diarization 追加"],
    verify: "音声アップ→segments に speaker/start/end が入る",
  },
  {
    title: "Step3: Embedding",
    purpose: "話者埋め込み生成（軽量サマリのみ保存）",
    routes: ["/lab/audio/embed"],
    endpoints: ["/embed"],
    db: ["lab_runs.type に speaker_embedding 追加"],
    verify: "音声アップ→embedding メタが lab_runs に保存",
  },
  {
    title: "Step4: Speaker Compare",
    purpose: "音声A/Bの埋め込み類似度（cosine）計算",
    routes: ["/lab/audio/compare"],
    endpoints: ["/compare"],
    db: ["lab_runs.type に speaker_compare 追加"],
    verify: "2ファイルアップ→similarity が保存/表示",
  },
  {
    title: "Step5: ASR × Diarize",
    purpose: "文字起こしと話者割当を同時実行",
    routes: ["/lab/audio/asr-diarize"],
    endpoints: ["/asr_diarize"],
    db: ["lab_runs.type に asr_diarize 追加"],
    verify: "segments に speaker+text が入り transcript 付きで保存",
  },
  {
    title: "Step6: AIメタ活用（検索）",
    purpose: "ai_meta を用いた IP カタログ検索（q/lang/speakers）",
    routes: ["/ip"],
    endpoints: ["Supabase filters"],
    db: ["ip_assets.ai_meta 追加"],
    verify: "/ip?q=xxx や lang/speakers フィルタで絞り込み",
  },
  {
    title: "Step7: 問い合わせ体験強化",
    purpose: "ai_meta を問い合わせ画面に提示し下書きテンプレ生成",
    routes: ["/ip/[id]", "/ip/[id]/inquire"],
    endpoints: ["N/A"],
    db: ["draft 非表示など"],
    verify: "AIメタパネル表示、メッセージにテンプレ初期文",
  },
  {
    title: "Step8: IP下書き作成",
    purpose: "lab_runs から ip_assets に draft を作成する PoC",
    routes: ["/lab/runs/[id] -> IP下書きを作成"],
    endpoints: ["service_role insert ip_assets"],
    db: ["ip_assets.lab_run_id, ai_meta, status=draft"],
    verify: "ボタン押下で draft 作成、/creator/ip/.../edit に遷移",
  },
];

const choreoSteps = [
  {
    title: "Step1: Pose 抽出",
    purpose: "MediaPipe Pose で骨格ランドマークを推定するPoC",
    routes: ["/lab/choreo/pose", "/lab/runs/[id]"],
    endpoints: ["/choreo/pose"],
    db: ["lab_runs.type に choreo_pose_extract 追加", "storage lab-inputs/lab-outputs"],
    value: "骨格33点の推定とメタ（language/segments_count/speakers_count）を取得し、AI実験ログとして保存",
    limits: "精度は参考値。動きが少ない/被写体が見切れる動画では推定が不安定",
  },
  {
    title: "Step2: 振付類似度 (cosine)",
    purpose: "骨格ベクトルを正規化し動画A/Bのコサイン類似度を計算",
    routes: ["/lab/choreo/compare"],
    endpoints: ["/choreo/compute mode=compare"],
    db: ["lab_runs.type に choreo_compare 追加"],
    value: "フレーム平均ベクトルでざっくり類似度を確認（AI実験ログ）",
    limits: "タイミングずれに弱く、動きの少ない動画では差が出にくい",
  },
  {
    title: "Step3: 振付類似度 (DTW)",
    purpose: "時間ずれに強いDTWで骨格軌跡を比較",
    routes: ["/lab/choreo/compare-dtw"],
    endpoints: ["/choreo/compute mode=compare_dtw"],
    db: ["lab_runs.type に choreo_compare_dtw 追加"],
    value: "Sakoe-Chibaバンド付きDTWでテンポ差を吸収しながら類似度を算出（AI実験ログ）",
    limits: "計算コストが高め。骨格推定の誤差に影響を受ける",
  },
  {
    title: "Step4: フレーズ分割",
    purpose: "骨格動きのエネルギーからフレーズ区間を推定",
    routes: ["/lab/choreo/segment"],
    endpoints: ["/choreo/compute mode=segment"],
    db: ["lab_runs.type に choreo_segment 追加"],
    value: "低エネルギー区間やピークドロップで区切り、レビュー用の区間リストを得る",
    limits: "単純なルールベース。静止/緩やかな動きでは分割品質が限定的",
  },
  {
    title: "Step5: フレーズ類似度",
    purpose: "動画Aフレーズごとに動画BのTop-Kマッチを提示",
    routes: ["/lab/choreo/phrase-compare"],
    endpoints: ["/choreo/compute mode=phrase_compare"],
    db: ["lab_runs.type に choreo_phrase_compare 追加"],
    value: "フレーズ単位のベクトル比較でレビューを効率化（AI実験ログ）",
    limits: "骨格推定と分割品質に依存。法的判断や精度保証はなし",
  },
  {
    title: "Step6: Poseキャッシュ全面適用",
    purpose: "同一動画の再解析を避け、実行時間を短縮",
    routes: ["全Choreo系"],
    endpoints: ["/choreo/pose キャッシュ", "/choreo/compute"],
    db: ["storage bucket lab-outputs 追加"],
    value: "sha256 ハッシュで pose JSON をキャッシュし、再利用（AI実験ログの高速化）",
    limits: "キャッシュは入力一致時のみ有効。ポーズ精度そのものは変わらない",
  },
  {
    title: "Step7: レビュー支援",
    purpose: "フレーズマッチ結果を動画プレイヤー付きで確認",
    routes: ["/lab/runs/[id] (choreo_phrase_compare)"],
    endpoints: ["Supabase storage signed URL"],
    db: ["なし（output_json に inputs.pose_ref など格納）"],
    value: "マッチ行から指定秒へジャンプ再生し、検証を高速化",
    limits: "プレイヤーは参考用。実映像と目視確認が前提",
  },
  {
    title: "Step8: 将来拡張フック",
    purpose: "ポーズキャッシュを軸に追加比較や生成系を試す土台",
    routes: ["N/A"],
    endpoints: ["pose JSON 再利用"],
    db: ["なし"],
    value: "キャッシュ済みポーズを使った新規比較/生成PoCの実験速度向上",
    limits: "現状はPoCレベル。モデル切替や精度保証は未実施",
  },
];

export default async function LabGuidePage() {
  await requireLabAdmin();

  return (
    <section className="mx-auto max-w-5xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Only</p>
        <h1 className="text-3xl font-semibold text-neutral-900">AI Lab ガイド（Step1-8）</h1>
        <p className="text-sm text-neutral-700">
          Next.js (App Router) + Supabase + FastAPI(Whisper/pyannote) で構成された PoC の流れをまとめています。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-900">全体アーキテクチャ</h2>
        <p className="mt-2 text-sm text-neutral-700">
          フロント: Next.js (App Router, Server Actions) / データ: Supabase (Postgres + Storage) / AI: FastAPI
          サービス (Whisper, pyannote) を Docker で起動し、lab_runs に実行ログと結果を保存しています。
        </p>
        <p className="mt-1 text-xs text-neutral-600">環境変数: ENABLE_LAB, ENABLE_LAB_IP_EXPORT, AI_SERVICE_URL, HF_TOKEN, SUPABASE_SERVICE_ROLE_KEY</p>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <details key={step.title} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-base font-semibold text-neutral-900">{step.title}</summary>
            <div className="mt-3 space-y-2 text-sm text-neutral-700">
              <p><span className="font-semibold text-neutral-900">目的:</span> {step.purpose}</p>
              <p><span className="font-semibold text-neutral-900">追加ルート:</span> {step.routes.join(", ")}</p>
              <p><span className="font-semibold text-neutral-900">AIエンドポイント:</span> {step.endpoints.join(", ")}</p>
              <p><span className="font-semibold text-neutral-900">DB変更:</span> {step.db.join(", ")}</p>
              <p><span className="font-semibold text-neutral-900">検証:</span> {step.verify}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-900">Choreo Lab（AI実験ログ）</h2>
        <p className="mt-2 text-sm text-neutral-700">
          骨格推定とフレーズレベルの類似度評価を PoC として実装し、lab_runs に実験ログを残しています。法的判断ではなく、レビューの効率化を目的としています。
        </p>
      </div>

      <div className="space-y-3">
        {choreoSteps.map((step) => (
          <details key={step.title} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-base font-semibold text-neutral-900">{step.title}</summary>
            <div className="mt-3 space-y-2 text-sm text-neutral-700">
              <p><span className="font-semibold text-neutral-900">目的:</span> {step.purpose}</p>
              <p><span className="font-semibold text-neutral-900">追加ルート:</span> {step.routes.join(", ")}</p>
              <p><span className="font-semibold text-neutral-900">AIエンドポイント:</span> {step.endpoints.join(", ")}</p>
              <p><span className="font-semibold text-neutral-900">技術要素:</span> {step.db.join(", ")}</p>
              <p><span className="font-semibold text-neutral-900">価値:</span> {step.value}</p>
              <p><span className="font-semibold text-neutral-900">限界:</span> {step.limits}</p>
            </div>
          </details>
        ))}
      </div>

      <Link
        href="/lab"
        className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
      >
        ← Labダッシュボードに戻る
      </Link>
    </section>
  );
}
