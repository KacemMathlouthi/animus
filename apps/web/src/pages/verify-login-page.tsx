import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDocumentTitle } from "@/hooks/use-document-title";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

/** Only honor an internal, single-leading-slash path so the post-login redirect
 * can't be pointed at an external origin. */
function safeCallback(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/studio";
}

/** Magic-link landing page. The email links HERE instead of the API's verify
 * endpoint: inbox security scanners open every link in an email, and the
 * verify endpoint consumes its single-use token on GET — so a direct link
 * arrives already-invalid. An auto-redirect variant was tried and defeated in
 * production: the scanner executed the page's JavaScript (paired verify hits
 * 134ms apart in the logs). Only a real click may spend the token — scanners
 * render pages, but they don't press buttons. */
export function VerifyLoginPage() {
  useDocumentTitle("Sign in");
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get("token");
  const callbackURL = safeCallback(searchParams.get("callbackURL"));

  const verifyUrl = useMemo(() => {
    if (!token) {
      return null;
    }
    const url = new URL("/api/auth/magic-link/verify", API_URL);
    url.searchParams.set("token", token);
    url.searchParams.set("callbackURL", callbackURL);
    return url.toString();
  }, [token, callbackURL]);

  const completeSignIn = () => {
    if (!verifyUrl) {
      return;
    }
    setSubmitting(true);
    window.location.assign(verifyUrl);
  };

  return (
    <main className="relative flex min-h-screen flex-col justify-center px-8">
      <div className="mx-auto w-full space-y-4 sm:max-w-md">
        <Link to="/">
          <Wordmark />
        </Link>

        {verifyUrl ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <h1 className="font-medium text-2xl tracking-tight">
                Confirm your sign-in
              </h1>
              <p className="text-base text-muted-foreground">
                Click below to finish signing in to animus.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={submitting}
              onClick={completeSignIn}
            >
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              Sign in
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <h1 className="font-medium text-2xl tracking-tight">
                This link is incomplete
              </h1>
              <p className="text-base text-muted-foreground">
                The sign-in link is missing its token — it may have been
                truncated by your email client. Request a fresh one.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
