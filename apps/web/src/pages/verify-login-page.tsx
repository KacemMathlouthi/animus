import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
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
 * would arrive already-invalid. Rendering this page is side-effect free; only
 * the button click below spends the token. */
export function VerifyLoginPage() {
	useDocumentTitle("Sign in");
	const [searchParams] = useSearchParams();
	const [submitting, setSubmitting] = useState(false);

	const token = searchParams.get("token");
	const callbackURL = safeCallback(searchParams.get("callbackURL"));

	const completeSignIn = () => {
		if (!token) {
			return;
		}
		setSubmitting(true);
		const url = new URL("/api/auth/magic-link/verify", API_URL);
		url.searchParams.set("token", token);
		url.searchParams.set("callbackURL", callbackURL);
		window.location.assign(url.toString());
	};

	return (
		<main className="relative flex min-h-screen flex-col justify-center px-8">
			<div className="mx-auto w-full space-y-4 sm:max-w-md">
				<Link to="/">
					<Wordmark />
				</Link>

				{token ? (
					<div className="space-y-4">
						<div className="flex size-11 items-center justify-center rounded-full bg-secondary">
							<MailCheckIcon className="size-5" />
						</div>
						<div className="flex flex-col space-y-1">
							<h1 className="font-medium text-2xl tracking-tight">
								Confirm your sign-in
							</h1>
							<p className="text-base text-muted-foreground">
								Click below to finish signing in to animus. The link in your
								email works once and expires 5 minutes after it was sent.
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
