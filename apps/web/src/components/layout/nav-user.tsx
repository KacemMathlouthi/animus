import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { BalanceSection } from "@/components/balance-section";
import { CreditGauge } from "@/components/credit-gauge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { useCredits } from "@/hooks/use-credits";
import { signOut, useSession } from "@/lib/auth-client";
import { displayNameFrom } from "@/lib/user";

export function NavUser() {
  const { data } = useSession();
  const navigate = useNavigate();
  const { balance, fraction } = useCredits();
  const [open, setOpen] = useState(false);
  const user = data?.user;

  if (!user) {
    return null;
  }

  const displayName = displayNameFrom(user.name, user.email);
  const pct = Math.round(fraction * 100);

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  function goToKeys() {
    setOpen(false);
    navigate("/settings/secrets");
  }

  function goToUsage() {
    setOpen(false);
    navigate("/settings/usage");
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="group cursor-pointer rounded-full"
          type="button"
        >
          <CreditGauge value={fraction}>
            <span className="relative block size-8">
              <UserAvatar
                className="size-8 transition duration-200 group-hover:blur-[2px]"
                email={user.email}
                image={user.image}
                name={user.name}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-background/50 font-semibold text-[10px] text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {pct}%
              </span>
            </span>
          </CreditGauge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <UserAvatar
            className="size-10 shrink-0"
            email={user.email}
            image={user.image}
            name={user.name}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              {displayName}
            </p>
            <p className="break-all text-muted-foreground text-xs">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => navigate("/settings/account")}
          >
            <UserIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => navigate("/settings/generation")}
          >
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {balance ? (
          <>
            <DropdownMenuSeparator />
            <BalanceSection
              balance={balance}
              fraction={fraction}
              onNavigateToKeys={goToKeys}
              onNavigateToUsage={goToUsage}
              variant="menu"
            />
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            onSelect={() => {
              void handleLogout();
            }}
            variant="destructive"
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
