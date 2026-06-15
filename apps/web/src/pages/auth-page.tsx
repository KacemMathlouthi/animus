import { AtSignIcon, ChevronLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AppleIcon } from "@/components/icons/apple-icon";
import { GithubIcon } from "@/components/icons/github-icon";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Wordmark } from "@/components/landing/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPage() {
	return (
		<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
			<div className="relative hidden h-full flex-col overflow-hidden border-r bg-secondary p-10 lg:flex">
				<div className="absolute inset-0">
					<AuthBackdrop />
				</div>
				<div className="absolute inset-0 bg-linear-to-b from-background/30 via-transparent to-background" />
				<div className="absolute inset-0 bg-[linear-gradient(170deg,theme(--color-background)_0%,transparent_15%)]" />
				<Link className="z-10 mr-auto" to="/">
					<Wordmark className="text-2xl" />
				</Link>

				<div className="z-10 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-xl">
							&ldquo;I described a topic over coffee and had a narrated,
							animated explainer before the cup was empty.&rdquo;
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

				<div className="mx-auto space-y-4 sm:w-sm">
					<Link className="lg:hidden" to="/">
						<Wordmark />
					</Link>
					<div className="flex flex-col space-y-1">
						<h1 className="font-medium text-2xl tracking-tight">
							Sign in or create your account
						</h1>
						<p className="text-base text-muted-foreground">
							Start turning topics into explainers in minutes.
						</p>
					</div>
					<div className="space-y-2">
						<Button className="w-full" variant="outline">
							<GoogleIcon data-icon="inline-start" />
							Continue with Google
						</Button>
						<Button className="w-full" variant="outline">
							<AppleIcon data-icon="inline-start" />
							Continue with Apple
						</Button>
						<Button className="w-full" variant="outline">
							<GithubIcon data-icon="inline-start" />
							Continue with GitHub
						</Button>
					</div>

					<AuthDivider>OR</AuthDivider>

					<form className="space-y-2">
						<p className="text-start text-muted-foreground text-xs">
							Enter your email address to sign in or create an account
						</p>
						<div className="relative">
							<AtSignIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
							<Input
								className="pl-8"
								placeholder="your.email@example.com"
								type="email"
							/>
						</div>

						<Button className="w-full" type="button">
							Continue with email
						</Button>
					</form>

					<p className="mt-8 text-muted-foreground text-sm">
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
