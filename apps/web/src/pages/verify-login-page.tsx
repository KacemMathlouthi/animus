import { useEffect, useMemo } from "react";
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
 * endpoint: inbox security scanners prefetch every link in an email, and the
 * verify endpoint consumes its single-use token on GET — so a direct link
 * would arrive already-invalid. Scanners fetch without executing JavaScript,
 * so this page forwards to the real endpoint from an effect: humans flash
 * through it ("Signing you in…"), scanners get inert HTML. The manual button
 * is a fallback for the rare case the redirect doesn't fire. */
export function VerifyLoginPage() {
	useDocumentTitle("Signing you in");
	const [searchParams] = useSearchParams();

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

	useEffect(() => {
		if (verifyUrl) {
			window.location.assign(verifyUrl);
		}
	}, [verifyUrl]);

	return (
		<main className="relative flex min-h-screen flex-col justify-center px-8">
			<div className="mx-auto w-full space-y-4 sm:max-w-md">
				<Link to="/">
					<Wordmark />
				</Link>

				{verifyUrl ? (
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<Spinner className="size-5" />
							<h1 className="font-medium text-2xl tracking-tight">
								Signing you in…
							</h1>
						</div>
						<p className="text-base text-muted-foreground">
							Hold on a moment. If nothing happens,{" "}
							<a
								className="underline underline-offset-4 hover:text-primary"
								href={verifyUrl}
							>
								continue manually
							</a>
							.
						</p>
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
