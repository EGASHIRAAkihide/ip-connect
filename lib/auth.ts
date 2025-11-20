import { supabaseClient } from "./supabaseClient";
import type { UserProfile } from "./types";

export const getCurrentProfile = async (): Promise<UserProfile | null> => {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load profile", error.message);
    return null;
  }

  return data as UserProfile;
};

