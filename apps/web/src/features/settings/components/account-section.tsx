import {
	CheckIcon,
	LogOutIcon,
	MonitorIcon,
	MoonIcon,
	SunIcon,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { signOut, useSession } from "@/lib/auth-client";
import { displayNameFrom } from "@/lib/user";
import { SectionHeading } from "./settings-ui";

const THEME_OPTIONS = [
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
	{ value: "system", label: "System", icon: MonitorIcon },
] as const;

function formatDate(value: Date | string | null | undefined): string {
	if (!value) {
		return "—";
	}
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function AccountSection() {
	const { data } = useSession();
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();
	const user = data?.user;

	if (!user) {
		return null;
	}

	const displayName = displayNameFrom(user.name, user.email);

	async function handleLogout() {
		await signOut();
		navigate("/");
	}

	return (
		<div>
			<SectionHeading
				description="Your profile and how you sign in."
				title="Account"
			/>

			<div className="space-y-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-4">
							<UserAvatar
								className="size-14"
								email={user.email}
								image={user.image}
								name={user.name}
							/>
							<div className="min-w-0">
								<CardTitle className="truncate text-lg">
									{displayName}
								</CardTitle>
								<CardDescription className="truncate">
									{user.email}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-0">
						<Separator />
						<div className="flex items-center justify-between py-3 text-sm">
							<span className="text-muted-foreground">Email</span>
							<div className="flex items-center gap-2">
								<span className="break-all">{user.email}</span>
								<Badge variant={user.emailVerified ? "secondary" : "outline"}>
									{user.emailVerified ? "Verified" : "Unverified"}
								</Badge>
							</div>
						</div>
						<Separator />
						<div className="flex items-center justify-between py-3 text-sm">
							<span className="text-muted-foreground">Member since</span>
							<span>{formatDate(user.createdAt)}</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Appearance</CardTitle>
						<CardDescription>
							How animus looks. System follows your device. Press D to toggle.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<fieldset className="grid grid-cols-3 gap-3">
							<legend className="sr-only">Theme</legend>
							{THEME_OPTIONS.map((option) => {
								const selected = theme === option.value;
								const Icon = option.icon;
								return (
									<button
										aria-pressed={selected}
										className={cnTheme(selected)}
										key={option.value}
										onClick={() => setTheme(option.value)}
										type="button"
									>
										{selected ? (
											<CheckIcon className="absolute top-2 right-2 size-4 text-primary" />
										) : null}
										<Icon className="size-5 text-muted-foreground" />
										{option.label}
									</button>
								);
							})}
						</fieldset>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Sign out</CardTitle>
						<CardDescription>End your session on this device.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={() => {
								void handleLogout();
							}}
							variant="outline"
						>
							<LogOutIcon data-icon="inline-start" />
							Sign out
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function cnTheme(selected: boolean): string {
	return [
		"relative flex flex-col items-center gap-2 rounded-md border p-4 text-sm transition-colors",
		selected ? "border-primary bg-accent" : "hover:bg-accent/50",
	].join(" ");
}
