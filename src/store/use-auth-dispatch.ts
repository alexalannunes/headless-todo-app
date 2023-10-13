import { useContext } from "react";
import { AuthDispatchContext } from "./auth-context";

export function useAuthDispatch() {
  const context = useContext(AuthDispatchContext);
  if (!context) {
    throw new Error("error useAuthDispatch");
  }
  return context;
}
