/** Where the landing page's primary CTAs ("Start creating") should lead:
 * straight into the studio when signed in, otherwise to the auth page. */

import { useSession } from "@/lib/auth-client";

export function useCtaTarget() {
	const { data } = useSession();
	return data ? "/studio" : "/auth";
}
