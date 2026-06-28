import { CompassIcon, HomeIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";

export function NotFoundPage() {
	return (
		<div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background">
			<Empty>
				<EmptyHeader>
					<EmptyTitle className="mask-b-from-20% mask-b-to-80% font-extrabold text-9xl">
						404
					</EmptyTitle>
					<EmptyDescription className="-mt-8 text-foreground/80">
						The page you're looking for might have been moved or doesn't exist.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<div className="flex gap-2">
						<Button asChild>
							<Link to="/">
								<HomeIcon data-icon="inline-start" />
								Go home
							</Link>
						</Button>

						<Button asChild variant="outline">
							<Link to="/studio">
								<CompassIcon data-icon="inline-start" />
								Open studio
							</Link>
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		</div>
	);
}
