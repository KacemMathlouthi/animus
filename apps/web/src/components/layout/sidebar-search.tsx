import { SearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarSearch() {
	const inputRef = useRef<HTMLInputElement>(null);
	const { isMobile, setOpen, setOpenMobile } = useSidebar();

	// ⌘K / Ctrl+K reveals the sidebar (if hidden) and focuses search.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (isMobile) {
					setOpenMobile(true);
				} else {
					setOpen(true);
				}
				inputRef.current?.focus({ preventScroll: true });
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isMobile, setOpen, setOpenMobile]);

	return (
		<div className="relative">
			<SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
			<Input
				aria-label="Search conversations"
				className="pr-13 pl-8"
				placeholder="Search…"
				ref={inputRef}
				type="search"
			/>
			<KbdGroup className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2">
				<Kbd>⌘</Kbd>
				<Kbd>K</Kbd>
			</KbdGroup>
		</div>
	);
}
