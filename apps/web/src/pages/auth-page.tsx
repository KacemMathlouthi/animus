import { AtSignIcon, ChevronLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AppleIcon } from "@/components/auth/icons/apple-icon";
import { GithubIcon } from "@/components/auth/icons/github-icon";
import { GoogleIcon } from "@/components/auth/icons/google-icon";
import { Wordmark } from "@/components/landing/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPage() {
	return (
		<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
			<div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
				<div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
				<Link className="z-10 mr-auto" to="/">
					<Wordmark />
				</Link>

				<div className="z-10 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-xl">
							&ldquo;I described a topic over coffee and had a narrated,
							animated explainer before the cup was empty.&rdquo;
						</p>
						<footer className="font-mono font-semibold text-muted-foreground text-sm">
							~ an early anima user
						</footer>
					</blockquote>
				</div>
			</div>

			<div className="relative flex min-h-screen flex-col justify-center px-8">
				{/* Top Shades */}
				<div
					aria-hidden
					className="-z-10 absolute inset-0 isolate contain-strict opacity-60"
				>
					<div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
					<div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
					<div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
				</div>

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
