import { useEffect, useRef } from "react";
import { useAuth } from "../store/use-auth";
import { LogoutButton } from "./logout-button";

const defaultAvatar =
  "https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg";

export function LoggedUser() {
  const { user } = useAuth();
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const imgRef = ref.current;

    const onError = () => {
      if (ref.current) {
        ref.current.src = defaultAvatar;
        imgRef?.removeEventListener("error", onError);
      }
    };

    imgRef?.addEventListener("error", onError);

    return () => {
      imgRef?.removeEventListener("error", onError);
    };
  }, []);
  return (
    <>
      <div>
        {user?.avatar_url && (
          <img
            className="avatar"
            ref={ref}
            onError={(e) => {
              console.log(e);
            }}
            src={user?.avatar_url}
            alt={user.email}
          />
        )}
        {user?.email}
        <LogoutButton />
      </div>
      <hr />
    </>
  );
}
