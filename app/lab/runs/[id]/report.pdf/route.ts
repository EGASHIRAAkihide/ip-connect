import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { notFound } from "next/navigation";
import { requireLabAdmin } from "@/lib/lab";
import type { LabRun } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scriptPath() {
  return path.join(process.cwd(), "apps", "pdf", "dist", "generate.js");
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireLabAdmin();
  const { id } = await context.params;

  const { data: run } = await supabase
    .from("lab_runs")
    .select("id")
    .eq("id", id)
    .maybeSingle<Pick<LabRun, "id">>();

  if (!run) return notFound();

  const origin = new URL(request.url).origin;
  const reportUrl = `${origin}/lab/runs/${id}/report`;

  const outPath = path.join(os.tmpdir(), `lab-run-${id}-${Date.now()}.pdf`);
  const generator = scriptPath();

  if (!(await fileExists(generator))) {
    return new Response(
      `PDF generator not built.\n\nRun:\n  cd apps/pdf && pnpm install && pnpm build\n\nMissing: ${generator}\n`,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [generator, reportUrl, outPath], {
      env: {
        ...process.env,
        REPORT_COOKIE: cookieHeader,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `pdf generator failed with exit code ${code}`));
    });
    child.on("error", reject);
  });

  const pdf = await fs.readFile(outPath);
  await fs.unlink(outPath).catch(() => null);

  return new Response(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"lab-run-${id}.pdf\"`,
      "Cache-Control": "no-store",
    },
  });
}

