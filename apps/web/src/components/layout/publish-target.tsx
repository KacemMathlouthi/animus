/** Shares the current publish target between the studio and the header's Publish
 * menu, which lives above the routed page. Null when nothing is publishable. */

import { createContext, use, useEffect, useMemo, useState } from "react";

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
	return use(PublishTargetContext)?.target ?? null;
}

/** Registers the publish target while mounted; clears it on unmount or when null. */
export function useRegisterPublishTarget(target: PublishTarget | null): void {
	const ctx = use(PublishTargetContext);
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
