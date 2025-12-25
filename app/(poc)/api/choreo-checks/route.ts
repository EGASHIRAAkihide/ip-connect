import { NextResponse } from "next/server";
import { getServerUserWithRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { createChoreoCheckFromFile } from "@/lib/poc/choreo-checks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, role } = await getServerUserWithRole();

  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (role !== "company") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const id = await createChoreoCheckFromFile({
      supabase,
      companyId: user.id,
      file,
    });

    if (!id) {
      console.error("[choreo-checks] upload failed: missing id");
      return NextResponse.json({ error: "upload failed" }, { status: 500 });
    }

    const { data: createdCheck, error: createdError } = await supabase
      .from("choreo_checks")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (createdError || !createdCheck) {
      console.error("[choreo-checks] upload failed: missing record", createdError);
      return NextResponse.json({ error: "upload failed" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "unknown";
    console.info("[choreo-checks] created", {
      host: supabaseHost,
      checkId: createdCheck.id,
    });

    return NextResponse.redirect(
      new URL(`/company/choreo-checks/${id}`, request.url),
      { status: 303 },
    );
  } catch (error) {
    console.error("[choreo-checks] upload failed", error);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
