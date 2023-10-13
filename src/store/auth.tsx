import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "./use-auth";
import { useAuthDispatch } from "./use-auth-dispatch";
import { Todos } from "../widgets/todos";
import { Login } from "../widgets/login";

export function AuthPage() {
  const { user, aud } = useAuth();
  const dispatch = useAuthDispatch();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function aaa() {
      const { data, error } = await supabase.auth.getSession();

      console.log({ error });

      if (data.session?.user) {
        const dataAuth = {
          user: {
            email: data.session.user.email as string,
            avatar_url: data.session.user.user_metadata.avatar_url,
            id: data.session.user.id,
          },
          aud: data.session.user.aud,
        };
        dispatch(dataAuth);
      } else {
        dispatch({
          user: null,
          aud: null,
        });
      }

      setLoading(false);
    }

    aaa();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        dispatch({
          user: null,
          aud: null,
        });
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  if (loading) {
    return <div>loading...</div>;
  }

  if (!user?.email || aud !== "authenticated") {
    return <Login />;
  }

  return <Todos />;
}
