/** The credit balance as a self-contained section: a thin line gauge, the
 * remaining/total in dollars, and a CTA into BYOK. Presentational — the caller
 * supplies the balance (from useCredits) and the navigation handler. Rendered in
 * two places: the profile dropdown ("menu") and the account page ("card"). */

import { type CreditsBalance, formatUsd } from "@animus/core";
import { KeyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

function LineGauge({ fraction }: { fraction: number }) {
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				className="h-full rounded-full bg-primary transition-[width] duration-500"
				style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
			/>
		</div>
	);
}

function Amounts({ balance }: { balance: CreditsBalance }) {
	return (
		<span className="tabular-nums">
			<span className="font-medium">{formatUsd(balance.balanceMicros)}</span>
			<span className="text-muted-foreground">
				{" "}
				/ {formatUsd(balance.grantMicros)}
			</span>
		</span>
	);
}

export function BalanceSection({
	variant,
	balance,
	fraction,
	onNavigateToKeys,
}: {
	variant: "menu" | "card";
	balance: CreditsBalance;
	fraction: number;
	onNavigateToKeys: () => void;
}) {
	if (variant === "menu") {
		return (
			<div className="px-1.5 py-1.5">
				<div className="mb-2 flex items-center justify-between text-xs">
					<span className="font-medium text-muted-foreground">Balance</span>
					<Amounts balance={balance} />
				</div>
				<LineGauge fraction={fraction} />
				<Button
					className="mt-2.5 w-full"
					onClick={onNavigateToKeys}
					size="sm"
					variant="outline"
				>
					<KeyIcon />
					Bring your own key
				</Button>
			</div>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-base">
					<span>Balance</span>
					<span className="font-medium text-sm">
						<Amounts balance={balance} />
					</span>
				</CardTitle>
				<CardDescription>
					Free credits for generating on our models. Bring your own key to keep
					generating for free once they run out.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<LineGauge fraction={fraction} />
				<Button onClick={onNavigateToKeys} variant="outline">
					<KeyIcon data-icon="inline-start" />
					Bring your own key
				</Button>
			</CardContent>
		</Card>
	);
}
