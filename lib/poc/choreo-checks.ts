import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type CreateChoreoCheckInput = {
  supabase: SupabaseClient;
  companyId: string;
  file: File;
};

export async function createChoreoCheckFromFile({
  supabase,
  companyId,
  file,
}: CreateChoreoCheckInput) {
  const arrayBuffer = await file.arrayBuffer();
  const hash = createHash("sha256")
    .update(Buffer.from(arrayBuffer))
    .digest("hex");
  const filename = file.name || "choreo.mp4";
  const path = `${companyId}/${Date.now()}-${randomUUID()}-${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("choreo-inputs")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`upload failed: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from("choreo_checks")
    .insert({
      company_id: companyId,
      video_path: path,
      video_hash: hash,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`insert failed: ${error?.message ?? "no data"}`);
  }

  return data.id as string;
}
