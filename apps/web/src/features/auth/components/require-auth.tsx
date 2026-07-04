/** Route guard: loader while the session resolves, /auth when signed out, protected tree when signed in. */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { LogoMark } from "@/components/brand/logo-mark";
import { useSession } from "@/lib/auth-client";

export function RequireAuth({ children }: { children: ReactNode }) {
	const { data: session, isPending } = useSession();
	const location = useLocation();

	if (isPending) {
		return (
			<div className="flex h-svh items-center justify-center">
				<LogoMark animate="loading" className="h-16 w-auto" />
			</div>
		);
	}

	if (!session) {
		return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
	}

	return children;
}
