import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { supabase } from "../supabase";
import { LoginGoogle } from "./login-google";
import { useAuthDispatch } from "../store/use-auth-dispatch";

interface ICredentialsForm {
  email: string;
  password: string;
}

const schema = yup.object().shape({
  email: yup.string().required("required").email("valid email"),
  password: yup.string().required("required").min(6, "min 6").max(12, "max 12"),
});

interface AuthFormProps {
  type: "login" | "signup";
}

function AuthForm({ type }: AuthFormProps) {
  const authDispatch = useAuthDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ICredentialsForm>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: yupResolver(schema),
  });

  const { mutate: authenticateCredentials, isLoading } = useMutation({
    mutationKey: ["auth"],
    mutationFn: async (params: ICredentialsForm) => {
      const request =
        type === "login"
          ? await supabase.auth.signInWithPassword(params)
          : await supabase.auth.signUp(params);

      if (request.error) {
        alert(request.error.message);
        return;
      }

      const userData = request.data.user;

      if (userData) {
        const dataAuth = {
          user: {
            email: userData.email as string,
            id: userData.id,
          },
          aud: userData.aud,
        };
        authDispatch(dataAuth);
      }
    },
  });

  const submit = (data: ICredentialsForm) => {
    authenticateCredentials(data);
  };

  const title = type === "login" ? "Login" : "Sign Up";

  return (
    <div>
      <h4>{title}</h4>
      <form style={{ display: "flex" }} onSubmit={handleSubmit(submit)}>
        <div>
          <input {...register("email", { required: true })} type="email" />
          {errors.email?.message}
        </div>
        <div>
          <input
            {...register("password", { required: true })}
            type="password"
          />
          {errors.password?.message}
        </div>
        <button type="submit" disabled={isLoading}>
          login
        </button>
      </form>
    </div>
  );
}

function LoginCredentials() {
  return <AuthForm type="login" />;
}

function SignUpCredentials() {
  return <AuthForm type="signup" />;
}

function useAuthCredentials() {
  const [form, setForm] = useState<"login" | "signup">("login");
  const signUp = () => setForm("signup");
  const login = () => setForm("login");
  const isLogin = form === "login";
  return {
    login,
    signUp,
    isLogin,
  };
}

export function Login() {
  const { signUp, login, isLogin } = useAuthCredentials();
  return (
    <div>
      {isLogin ? <LoginCredentials /> : <SignUpCredentials />}

      <button
        onClick={() => {
          if (isLogin) {
            return signUp();
          }
          login();
        }}
      >
        {isLogin ? "Sign up form" : "Login form"}
      </button>
      <hr />
      <LoginGoogle />
    </div>
  );
}
