# App Structure (Phase 1)

## 旧画面 (legacy)
- 現在の app/creator, app/company, app/ip, app/analytics, app/users など
- 既存導線は残すが、段階的に移行する前提

## 新画面 (poc)
- /poc を入口にし、PoC最小機能のみを追加していく
- 企業向け choreo-checks などを優先して集約

## AI Lab (lab)
- /lab 配下を維持
- 実験専用で、本体プロダクトとは分離

## Phase 2 以降の移行（概要）
- 既存ページを (legacy)/(poc)/(lab) に段階的に移動
- まずは導線整理と最小機能の集約を優先
- URLの変更は段階的に行う
