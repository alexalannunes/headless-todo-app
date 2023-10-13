import { supabase } from "../supabase";

export function LogoutButton() {
  return (
    <button
      onClick={() => {
        window.history.replaceState({}, "", "/");
        supabase.auth.signOut();
      }}
    >
      logout
    </button>
  );
}
