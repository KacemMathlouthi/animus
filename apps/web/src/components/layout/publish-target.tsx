/** Shares "what, if anything, can be published right now" between the studio
 * (which knows the current video) and the app header's Publish menu (which lives
 * above the routed page). The studio sets a target when a render is ready and
 * clears it otherwise; the menu is disabled whenever the target is null. */

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PublishTarget = { videoKey: string; title: string };

type PublishTargetContextValue = {
	target: PublishTarget | null;
	setTarget: (target: PublishTarget | null) => void;
};

const PublishTargetContext = createContext<PublishTargetContextValue | null>(
	null,
);

export function PublishTargetProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [target, setTarget] = useState<PublishTarget | null>(null);
	const value = useMemo(() => ({ target, setTarget }), [target]);
	return (
		<PublishTargetContext.Provider value={value}>
			{children}
		</PublishTargetContext.Provider>
	);
}

/** The current publish target (null when nothing is publishable). */
export function usePublishTarget(): PublishTarget | null {
	return useContext(PublishTargetContext)?.target ?? null;
}

/** Register the publish target for as long as the calling component is mounted
 * with a defined target; clears it on unmount or when the target goes away. */
export function useRegisterPublishTarget(target: PublishTarget | null): void {
	const ctx = useContext(PublishTargetContext);
	const setTarget = ctx?.setTarget;
	const videoKey = target?.videoKey;
	const title = target?.title;
	useEffect(() => {
		if (!setTarget) {
			return;
		}
		setTarget(videoKey ? { videoKey, title: title ?? "" } : null);
		return () => setTarget(null);
	}, [setTarget, videoKey, title]);
}
