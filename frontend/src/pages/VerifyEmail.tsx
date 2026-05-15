import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { Loader2 } from "lucide-react";

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("ok");
        setMessage("Email verified. You can sign in now.");
      })
      .catch((err: { error?: { message?: string } }) => {
        setStatus("error");
        setMessage(err?.error?.message || "Verification failed.");
      });
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        {status === "loading" && (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
        )}
        {status !== "loading" && (
          <p className={status === "ok" ? "text-green-400" : "text-red-400"}>
            {message}
          </p>
        )}
        <Link to="/login" className="mt-6 inline-block text-accent hover:underline">
          Go to sign in
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
