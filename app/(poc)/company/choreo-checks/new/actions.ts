"use server";

import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/auth";
import { createServerActionClient } from "@/lib/supabase/server";
import { createChoreoCheckFromFile } from "@/lib/poc/choreo-checks";

export async function createChoreoCheck(formData: FormData) {
  const { user } = await requireCompany();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("file is required");
  }

  const supabase = await createServerActionClient();
  const id = await createChoreoCheckFromFile({
    supabase,
    companyId: user.id,
    file,
  });

  redirect(`/company/choreo-checks/${id}`);
}
