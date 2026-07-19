/** Auth-aware actions for the landing nav. Signed out: Sign in + Get started.
 * Signed in: Open studio + the account avatar (desktop) or just Open studio
 * (stacked/mobile). */

import { Link } from "react-router";
import { NavUser } from "@/components/layout/nav-user";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** True once any instance has seen the session resolve. `useSession` flips
 * back to pending on every background refetch (window focus, another
 * subscriber mounting, route changes remounting the header) — hiding the
 * buttons each time reads as flickering when the round-trip is slow, so only
 * the very first load gets the blank slot. */
let sessionResolvedOnce = false;

export function AuthActions({ stacked = false }: { stacked?: boolean }) {
	const { data, isPending } = useSession();

	if (!isPending) {
		sessionResolvedOnce = true;
	}

	// Avoid flashing the signed-out buttons before the session first resolves;
	// afterwards, refetches keep rendering the last-known state.
	if (isPending && !sessionResolvedOnce) {
		return null;
	}

	const size = stacked ? "default" : "sm";
	const width = stacked ? "w-full" : undefined;

	if (data) {
		return (
			<>
				<Button asChild className={cn(width, !stacked && "ml-1")} size={size}>
					<Link to="/studio">Open studio</Link>
				</Button>
				{stacked ? null : <NavUser />}
			</>
		);
	}

	return (
		<>
			<Button
				asChild
				className={cn(width, !stacked && "ml-1")}
				size={size}
				variant="outline"
			>
				<Link to="/auth">Sign in</Link>
			</Button>
			<Button asChild className={width} size={size}>
				<Link to="/auth">Get started</Link>
			</Button>
		</>
	);
}
