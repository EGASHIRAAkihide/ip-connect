export const messages = {
  en: {
    nav_home: "Home",
    nav_browse_ip: "Browse IP",
    nav_creator_dashboard: "Creator Dashboard",
    nav_creator_inbox: "Creator Inbox",
    nav_company_inquiries: "Company Inquiries",
    nav_my_profile: "My Profile",
    nav_login: "Login",
    nav_register: "Register",
    nav_logout: "Logout",
    nav_lang_en: "EN",
    nav_lang_ja: "日本語",

    // Home / common
    app_title: "IP Connect PoC",
    app_subtitle:
      "Minimal workflow for creators to publish IP assets and companies to request licenses.",

    // IP listing/detail
    ip_browse_title: "Browse IP assets",
    ip_no_assets: "No IP assets published yet.",
    ip_category_voice: "Voice",
    ip_category_illustration: "Illustration",
    ip_category_choreography: "Choreography",

    // Inquiry
    inquiry_request_title: "Request license",
    inquiry_usage_purpose: "Usage purpose",
    inquiry_region: "Region",
    inquiry_period: "Intended usage period",
    inquiry_budget: "Budget (optional, USD)",
    inquiry_message: "Message",
    inquiry_submit: "Send inquiry",

    // Generic
    loading: "Loading…",
  },
  ja: {
    nav_home: "ホーム",
    nav_browse_ip: "IPを探す",
    nav_creator_dashboard: "クリエイターダッシュボード",
    nav_creator_inbox: "クリエイター受信箱",
    nav_company_inquiries: "企業からの問い合わせ",
    nav_my_profile: "マイプロフィール",
    nav_login: "ログイン",
    nav_register: "新規登録",
    nav_logout: "ログアウト",
    nav_lang_en: "EN",
    nav_lang_ja: "日本語",

    app_title: "IP Connect PoC",
    app_subtitle:
      "クリエイターのIPを公開し、企業がライセンス利用を相談できる最小限のワークフローです。",

    ip_browse_title: "IPアセット一覧",
    ip_no_assets: "まだIPアセットは登録されていません。",
    ip_category_voice: "ボイス",
    ip_category_illustration: "イラスト",
    ip_category_choreography: "振付",

    inquiry_request_title: "ライセンス利用の問い合わせ",
    inquiry_usage_purpose: "利用目的",
    inquiry_region: "利用地域",
    inquiry_period: "想定利用期間",
    inquiry_budget: "予算（任意・USD）",
    inquiry_message: "メッセージ",
    inquiry_submit: "問い合わせを送信",

    loading: "読み込み中…",
  },
} as const;

export type Language = keyof typeof messages;
export type MessageKey = keyof typeof messages.en;
