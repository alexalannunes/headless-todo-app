import { supabase } from "../supabase";

export function LoginGoogle() {
  return (
    <button
      onClick={() => {
        supabase.auth.signInWithOAuth({
          provider: "google",
        });
      }}
    >
      login with Google
    </button>
  );
}
