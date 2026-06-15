import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const toggle = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	return (
		<Button
			aria-label="Toggle theme"
			onClick={toggle}
			size="icon-sm"
			variant="ghost"
		>
			<SunIcon className="hidden dark:block" />
			<MoonIcon className="block dark:hidden" />
		</Button>
	);
}
