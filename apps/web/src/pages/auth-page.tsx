import { AtSignIcon, ChevronLeftIcon, MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import { Wordmark } from "@/components/brand/wordmark";
import { GithubIcon } from "@/components/icons/github-icon";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AuthBackdrop } from "@/features/auth/components/auth-backdrop";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { signIn, useSession } from "@/lib/auth-client";

const STUDIO_PATH = "/studio";
const DEFAULT_ERROR = "Something went wrong. Please try again.";

/** Only honor an internal, single-leading-slash path so the post-login redirect
 * can't be pointed at an external origin. */
function safeRedirect(from: unknown): string {
	if (
		typeof from === "string" &&
		from.startsWith("/") &&
		!from.startsWith("//")
	) {
		return from;
	}
	return STUDIO_PATH;
}

type SocialProvider = "github" | "google";
type Pending = SocialProvider | "email" | null;

export function AuthPage() {
	const { data: session, isPending } = useSession();
	const location = useLocation();
	const [searchParams] = useSearchParams();

	// Where to land after signing in: the page the guard bounced us from, else
	// the studio.
	const destination = safeRedirect(
		(location.state as { from?: string } | null)?.from,
	);
	const [email, setEmail] = useState("");
	const [pending, setPending] = useState<Pending>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(() =>
		searchParams.get("error") ? DEFAULT_ERROR : null,
	);

	useDocumentTitle("Sign in");

	// Already signed in — skip the form entirely.
	if (!isPending && session) {
		return <Navigate replace to={destination} />;
	}

	const callbackURL = `${window.location.origin}${destination}`;
	const errorCallbackURL = `${window.location.origin}/auth`;

	async function handleSocial(provider: SocialProvider) {
		setError(null);
		setPending(provider);
		const { error: err } = await signIn.social({
			provider,
			callbackURL,
			errorCallbackURL,
		});
		// On success the browser redirects to the provider; we only land here on
		// a pre-redirect failure.
		if (err) {
			setError(err.message ?? DEFAULT_ERROR);
			setPending(null);
		}
	}

	async function submitMagicLink() {
		const value = email.trim();
		if (!value) {
			return;
		}
		setError(null);
		setPending("email");
		const { error: err } = await signIn.magicLink({
			email: value,
			callbackURL,
		});
		setPending(null);
		if (err) {
			setError(err.message ?? DEFAULT_ERROR);
			return;
		}
		setSentTo(value);
	}

	return (
		<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
			<div className="relative hidden h-full flex-col overflow-hidden border-r bg-secondary p-10 lg:flex">
				<div className="absolute inset-0">
					<AuthBackdrop />
				</div>
				<div className="absolute inset-0 bg-linear-to-b from-background/30 via-transparent to-background" />
				<div className="absolute inset-0 bg-[linear-gradient(170deg,var(--background)_0%,transparent_15%)]" />
				<Link className="z-10 mr-auto" to="/">
					<Wordmark className="text-2xl" />
				</Link>

				<div className="z-10 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-xl">
							&ldquo;I described it over coffee — it animated the rest.&rdquo;
						</p>
						<footer className="font-mono font-semibold text-muted-foreground text-sm">
							~ an early animus user
						</footer>
					</blockquote>
				</div>
			</div>

			<div className="relative flex min-h-screen flex-col justify-center px-8">
				<Button asChild className="absolute top-7 left-5" variant="ghost">
					<Link to="/">
						<ChevronLeftIcon data-icon="inline-start" />
						Home
					</Link>
				</Button>

				<div className="mx-auto space-y-4 sm:w-md">
					<Link className="lg:hidden" to="/">
						<Wordmark />
					</Link>

					{sentTo ? (
						<div className="space-y-4">
							<div className="flex size-11 items-center justify-center rounded-full bg-secondary">
								<MailCheckIcon className="size-5" />
							</div>
							<div className="flex flex-col space-y-1">
								<h1 className="font-medium text-2xl tracking-tight">
									Check your email
								</h1>
								<p className="text-base text-muted-foreground">
									We sent a sign-in link to{" "}
									<span className="font-medium text-foreground">{sentTo}</span>.
								</p>
								<p className="text-base text-muted-foreground">
									Click it to continue. Expires in 5 minutes.
								</p>
							</div>
							<Button
								className="px-0"
								onClick={() => setSentTo(null)}
								type="button"
								variant="link"
							>
								Use a different email
							</Button>
						</div>
					) : (
						<>
							<div className="flex flex-col space-y-1">
								<h1 className="font-medium text-2xl tracking-tight">
									Sign in or create your account
								</h1>
								<p className="text-base text-muted-foreground">
									Start turning topics into explainers in minutes.
								</p>
							</div>

							{error ? (
								<p
									className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
									role="alert"
								>
									{error}
								</p>
							) : null}

							<div className="space-y-2">
								<Button
									className="w-full"
									disabled={pending !== null}
									onClick={() => handleSocial("google")}
									variant="outline"
								>
									{pending === "google" ? (
										<Spinner data-icon="inline-start" />
									) : (
										<GoogleIcon data-icon="inline-start" />
									)}
									Continue with Google
								</Button>
								<Button
									className="w-full"
									disabled={pending !== null}
									onClick={() => handleSocial("github")}
									variant="outline"
								>
									{pending === "github" ? (
										<Spinner data-icon="inline-start" />
									) : (
										<GithubIcon data-icon="inline-start" />
									)}
									Continue with GitHub
								</Button>
							</div>

							<AuthDivider>OR</AuthDivider>

							<form
								className="space-y-2"
								onSubmit={(event) => {
									event.preventDefault();
									void submitMagicLink();
								}}
							>
								<p
									className="text-start text-muted-foreground text-xs"
									id="email-hint"
								>
									Enter your email address to sign in or create an account
								</p>
								<div className="relative">
									<AtSignIcon
										aria-hidden="true"
										className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
									/>
									<Input
										aria-describedby="email-hint"
										aria-label="Email address"
										className="pl-8"
										disabled={pending !== null}
										onChange={(event) => setEmail(event.target.value)}
										placeholder="your.email@example.com"
										type="email"
										value={email}
									/>
								</div>

								<Button
									className="w-full"
									disabled={pending !== null || !email.trim()}
									type="submit"
								>
									{pending === "email" ? (
										<Spinner data-icon="inline-start" />
									) : null}
									Continue with email
								</Button>
							</form>
						</>
					)}

					<p className="mt-8 text-muted-foreground text-xs">
						By continuing, you agree to our{" "}
						<a
							className="underline underline-offset-4 hover:text-primary"
							href="/terms"
						>
							Terms of Service
						</a>{" "}
						and{" "}
						<a
							className="underline underline-offset-4 hover:text-primary"
							href="/privacy"
						>
							Privacy Policy
						</a>
						.
					</p>
				</div>
			</div>
		</main>
	);
}
