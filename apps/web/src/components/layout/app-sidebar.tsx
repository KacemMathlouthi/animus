import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Wordmark } from "@/components/brand/wordmark";
import { ConversationList } from "@/components/layout/conversation-list";
import { SidebarSearch } from "@/components/layout/sidebar-search";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [search, setSearch] = useState("");

  return (
    <Sidebar
      className={cn(
        "*:data-[slot=sidebar-inner]:bg-background",
        "*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,theme(--color-foreground/.08),transparent)]",
        "**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75"
      )}
      collapsible="offcanvas"
      variant="sidebar"
    >
      <SidebarHeader className="h-14 justify-center border-b px-3">
        <Link
          className="-mx-1 inline-flex w-fit items-center rounded-md px-1.5 py-1 transition-colors hover:bg-sidebar-accent"
          to="/studio"
        >
          <Wordmark className="gap-2.5 text-xl" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="gap-2">
          <Button asChild className="w-full justify-start" variant="outline">
            <Link to="/studio">
              <PlusIcon data-icon="inline-start" />
              New video
            </Link>
          </Button>
          <SidebarSearch onChange={setSearch} value={search} />
        </SidebarGroup>
        <ConversationList search={search} />
      </SidebarContent>
    </Sidebar>
  );
}
