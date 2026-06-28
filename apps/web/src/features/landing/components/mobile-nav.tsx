import { MenuIcon, XIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { AuthActions } from "@/features/landing/components/auth-actions";
import { navLinks } from "@/features/landing/components/header";
import { Portal, PortalBackdrop } from "@/features/landing/components/portal";
import { cn } from "@/lib/utils";

export function MobileNav() {
	const [open, setOpen] = React.useState(false);
	const panelRef = React.useRef<HTMLDivElement>(null);

	const close = React.useCallback(() => setOpen(false), []);

	// Close on Escape, and move focus into the panel when it opens so keyboard
	// users land inside the menu rather than behind the overlay.
	React.useEffect(() => {
		if (!open) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				close();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		panelRef.current?.focus();
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, close]);

	return (
		<div className="md:hidden">
			<Button
				aria-controls="mobile-menu"
				aria-expanded={open}
				aria-label="Toggle menu"
				className="md:hidden"
				onClick={() => setOpen(!open)}
				size="icon"
				variant="outline"
			>
				{open ? (
					<XIcon className="size-4.5" />
				) : (
					<MenuIcon className="size-4.5" />
				)}
			</Button>
			{open && (
				<Portal className="top-14" id="mobile-menu">
					<PortalBackdrop data-state="open" />
					<div
						className={cn(
							"data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
							"size-full p-4 outline-none",
						)}
						data-slot={open ? "open" : "closed"}
						ref={panelRef}
						tabIndex={-1}
					>
						<div className="grid gap-y-2">
							{navLinks.map((link) => (
								<Button
									asChild
									className="justify-start"
									key={link.label}
									variant="ghost"
								>
									<a href={link.href} onClick={close}>
										{link.label}
									</a>
								</Button>
							))}
						</div>
						<div className="mt-12 flex flex-col gap-2">
							<AuthActions stacked />
						</div>
					</div>
				</Portal>
			)}
		</div>
	);
}
