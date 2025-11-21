'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

type Analytics = {
  totalCreators: number;
  totalCompanies: number;
  totalAssets: number;
  totalInquiries: number;
  inquiriesByStatus: Record<string, number>;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        setLoading(false);
        return;
      }

      const [
        { count: totalCreators, error: creatorsError },
        { count: totalCompanies, error: companiesError },
        { count: totalAssets, error: assetsError },
        { count: totalInquiries, error: inquiriesError },
      ] = await Promise.all([
        supabaseClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("role", "creator"),
        supabaseClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("role", "company"),
        supabaseClient
          .from("ip_assets")
          .select("id", { count: "exact", head: true }),
        supabaseClient
          .from("inquiries")
          .select("id", { count: "exact", head: true }),
      ]);

      if (creatorsError || companiesError || assetsError || inquiriesError) {
        setError("Failed to load analytics.");
        console.error(
          creatorsError || companiesError || assetsError || inquiriesError,
        );
        setLoading(false);
        return;
      }

      const inquiriesByStatus: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      const {
        data: statusRows,
        error: statusError,
      } = await supabaseClient
        .from("inquiries")
        .select("status, count:id");

      if (statusError) {
        const { data: allStatuses, error: fallbackError } = await supabaseClient
          .from("inquiries")
          .select("status");

        if (fallbackError) {
          setError("Failed to load analytics.");
          console.error(statusError, fallbackError);
          setLoading(false);
          return;
        }

        allStatuses?.forEach(({ status }) => {
          inquiriesByStatus[status] = (inquiriesByStatus[status] || 0) + 1;
        });
      } else if (statusRows) {
        statusRows.forEach((row) => {
          inquiriesByStatus[row.status] = row.count ?? 0;
        });
      }

      setMetrics({
        totalCreators: totalCreators ?? 0,
        totalCompanies: totalCompanies ?? 0,
        totalAssets: totalAssets ?? 0,
        totalInquiries: totalInquiries ?? 0,
        inquiriesByStatus,
      });
      setLoading(false);
    };

    loadMetrics();
  }, [router]);

  if (loading) {
    return <p className="mt-8 text-slate-300">Loading analytics…</p>;
  }

  if (error) {
    return (
      <p className="mt-8 text-sm text-amber-300" role="alert">
        {error}
      </p>
    );
  }

  if (!metrics) {
    return null;
  }

  const statusOrder = ["pending", "approved", "rejected"];

  return (
    <section className="mx-auto mt-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Analytics (PoC)</h1>
        <p className="mt-1 text-sm text-slate-400">
          High-level metrics for validating the IP Connect PoC.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Creators", value: metrics.totalCreators },
          { label: "Companies", value: metrics.totalCompanies },
          { label: "IP Assets", value: metrics.totalAssets },
          { label: "Inquiries", value: metrics.totalInquiries },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-sm text-slate-400">{metric.label}</p>
            <p className="text-3xl font-semibold text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm text-slate-400">Inquiries by status</p>
        <dl className="mt-3 space-y-2">
          {statusOrder.map((status) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
            >
              <dt className="text-sm capitalize text-slate-300">{status}</dt>
              <dd className="text-lg font-semibold text-white">
                {metrics.inquiriesByStatus[status] ?? 0}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
