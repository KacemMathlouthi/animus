import { LegalLayout } from "@/features/legal/components/legal-layout";

const ISSUES_URL = "https://github.com/KacemMathlouthi/animus/issues";

export function PrivacyPage() {
	return (
		<LegalLayout lastUpdated="June 17, 2026" title="Privacy Policy">
			<p>
				animus is an open-source project, and this page explains in plain terms
				what data it touches when you use it. The short version: it collects
				only what it needs to sign you in and generate your videos, and it
				doesn't sell anything to anyone.
			</p>

			<h2>1. What it collects</h2>
			<ul>
				<li>
					<strong>Your email</strong>, so you can sign in with a magic link.
				</li>
				<li>
					<strong>Basic profile info</strong> (such as your name and avatar) if
					you choose to sign in with GitHub or Google.
				</li>
				<li>
					<strong>What you submit</strong>, the topics and prompts you give it
					to generate videos.
				</li>
				<li>
					<strong>Basic technical logs</strong>, like sign-in activity, used to
					keep the project running and secure.
				</li>
			</ul>

			<h2>2. How it's used</h2>
			<p>
				Your data is used only to run animus: to sign you in, to generate the
				videos you ask for, and to keep the project working. It is not sold,
				rented, or used for advertising.
			</p>

			<h2>3. Third parties</h2>
			<p>
				animus relies on a few services to work, and they handle some of your
				data under their own privacy policies:
			</p>
			<ul>
				<li>
					<strong>GitHub</strong> and <strong>Google</strong> for optional
					social sign-in.
				</li>
				<li>
					<strong>Resend</strong> for delivering magic-link sign-in emails.
				</li>
			</ul>

			<h2>4. Cookies</h2>
			<p>
				There's a single session cookie that keeps you signed in. It's required
				for the Service to work and isn't used for tracking or ads.
			</p>

			<h2>5. Where it lives</h2>
			<p>
				Your data is stored in the project's own database. Because animus is a
				small, experimental project, please don't put anything sensitive into
				it. Security is best-effort, with no guarantees, and data may be reset
				or wiped as the project changes.
			</p>

			<h2>6. It's open source</h2>
			<p>
				You don't have to take our word for any of this — you can read exactly
				what animus does in the{" "}
				<a
					href="https://github.com/KacemMathlouthi/animus"
					rel="noreferrer"
					target="_blank"
				>
					source code
				</a>
				.
			</p>

			<h2>7. Removing your data</h2>
			<p>
				Want your account or data removed? Open an issue on{" "}
				<a href={ISSUES_URL} rel="noreferrer" target="_blank">
					GitHub
				</a>{" "}
				and we'll take care of it.
			</p>

			<h2>8. Changes</h2>
			<p>
				This policy may change as the project evolves. When it does, the "Last
				updated" date above will change.
			</p>

			<h2>9. Contact</h2>
			<p>
				Questions about privacy? Reach out via{" "}
				<a href={ISSUES_URL} rel="noreferrer" target="_blank">
					GitHub issues
				</a>
				.
			</p>
		</LegalLayout>
	);
}
