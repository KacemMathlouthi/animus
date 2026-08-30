/** Auth-aware actions for the landing nav. Signed out: Sign in + Get started.
 * Signed in: Open studio + the account avatar (desktop) or just Open studio
 * (stacked/mobile). */

import { Link } from "react-router";
import { NavUser } from "@/components/layout/nav-user";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function AuthActions({ stacked = false }: { stacked?: boolean }) {
  // No pending gate: a cold start can hang the session request for seconds,
  // and an empty header slot reads as a broken page. `useSession` keeps its
  // last data across refetches, so this swaps at most once.
  const { data } = useSession();

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
