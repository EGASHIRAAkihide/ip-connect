"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "../actions";

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "作成中…" : "新規登録"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, initialState);

  return (
    <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-neutral-900">新規登録</h1>
      <p className="mt-2 text-sm text-neutral-600">
        ロールを選択してください（PoC用）。
      </p>
      <form action={formAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-neutral-800">
          メールアドレス
          <input
            type="email"
            name="email"
            required
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
          />
        </label>
        <label className="block text-sm font-medium text-neutral-800">
          パスワード
          <input
            type="password"
            name="password"
            minLength={6}
            required
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
          />
        </label>
        <label className="block text-sm font-medium text-neutral-800">
          ロール
          <select
            name="role"
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            defaultValue="creator"
          >
            <option value="creator">クリエイター</option>
            <option value="company">企業</option>
          </select>
        </label>
        <SubmitButton />
      </form>
      {state.error && (
        <p className="mt-4 text-sm text-neutral-700" role="status">
          {state.error}
        </p>
      )}
      <p className="mt-6 text-sm text-neutral-600">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/auth/login" className="text-neutral-900 underline">
          ログイン
        </Link>
      </p>
    </section>
  );
}
