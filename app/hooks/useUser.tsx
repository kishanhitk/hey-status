import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import { Database } from "~/types/supabase";
import { User } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["users"]["Row"] & {
  organization: Database["public"]["Tables"]["organizations"]["Row"] | null;
};

type UserWithProfile = User & {
  profile: Profile;
};

export function useUser() {
  const supabase = useSupabase();

  const { data: user, isLoading } = useQuery<UserWithProfile | null>({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*, organization:organization_id(*)")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        throw error;
      }

      const profile: Profile = {
        ...data,
        organization: data.organization || null,
      };

      return {
        ...authUser,
        profile,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { user, loading: isLoading };
}
