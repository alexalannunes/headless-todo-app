import { ReactNode, createContext, useState } from "react";

export interface ISession {
  user: {
    email: string;
    avatar_url?: string;
    id: string;
  } | null;
  aud: string | null;
}

export const AuthContext = createContext<ISession>({
  user: null,
  aud: null,
});
export const AuthDispatchContext = createContext<
  React.Dispatch<React.SetStateAction<ISession>>
>(() => {});

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<ISession>({
    user: null,
    aud: null,
  });

  return (
    <AuthContext.Provider value={user}>
      <AuthDispatchContext.Provider value={setUser}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthContext.Provider>
  );
}
