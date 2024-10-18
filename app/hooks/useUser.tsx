import { useEffect, useState } from "react";
import { useSupabase } from "./useSupabase";
import { Database } from "~/types/supabase";
import { User } from "@supabase/supabase-js";
type UserWithProfile = User & {
  profile: Database["public"]["Tables"]["users"]["Row"];
};
export function useUser() {
  const supabase = useSupabase();
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          return;
        }

        setUser({
          ...authUser,
          profile: data,
        });
      }
      setLoading(false);
    };

    fetchUser();
  }, [supabase]);

  return { user, loading };
}
