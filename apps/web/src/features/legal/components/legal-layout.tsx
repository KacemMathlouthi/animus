/** Shared chrome for the static legal pages (Terms, Privacy): header/footer
 * around a centered prose column. Pages pass plain semantic markup (h2/p/ul);
 * the article's descendant styles handle the typography. */

import type { ReactNode } from "react";
import { Footer } from "@/features/landing/components/footer";
import { Header } from "@/features/landing/components/header";

export function LegalLayout({
	title,
	lastUpdated,
	children,
}: {
	title: string;
	lastUpdated: string;
	children: ReactNode;
}) {
	return (
		<div className="min-h-svh overflow-x-clip bg-background">
			<Header />
			<main className="mx-auto max-w-3xl px-6 pt-28 pb-20 md:pt-32">
				<header className="mb-10 space-y-2 border-b pb-6">
					<h1 className="font-medium text-3xl tracking-tight">{title}</h1>
					<p className="text-muted-foreground text-sm">
						Last updated {lastUpdated}
					</p>
				</header>
				<article className="space-y-4 text-muted-foreground text-sm leading-relaxed [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:tracking-tight [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
					{children}
				</article>
			</main>
			<Footer />
		</div>
	);
}
