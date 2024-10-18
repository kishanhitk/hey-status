import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useSupabase } from "./useSupabase";

const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useSupabase();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();

      setUser(data?.user);
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  return { user, loading };
};

export default useUser;
