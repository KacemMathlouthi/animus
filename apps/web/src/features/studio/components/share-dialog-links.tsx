import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LinkedInIcon,
  RedditIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/brand/social-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createShareLink } from "@/lib/share";
import { cn } from "@/lib/utils";

const COPIED_RESET_MS = 2000;

// Each opens the network's share intent in a new tab, prefilled with the link
// (and title where the network supports it).
const SOCIALS: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: (url: string, text: string) => string;
}[] = [
  {
    label: "X",
    Icon: XIcon,
    href: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    label: "LinkedIn",
    Icon: LinkedInIcon,
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    label: "Reddit",
    Icon: RedditIcon,
    href: (url, text) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    label: "WhatsApp",
    Icon: WhatsAppIcon,
    href: (url, text) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
];

type LinkState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; url: string };

// Mounted by ShareDialog only while the dialog is open, so its link + copied
// state starts fresh on each open — no prop-driven reset needed.
export function ShareDialogLinks({
  videoKey,
  title,
}: {
  videoKey: string;
  title: string;
}) {
  const [link, setLink] = useState<LinkState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    createShareLink(videoKey)
      .then((url) => {
        if (active) {
          setLink({ status: "ready", url });
        }
      })
      .catch(() => {
        if (active) {
          setLink({ status: "error" });
        }
      });
    return () => {
      active = false;
    };
  }, [videoKey]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const url = link.status === "ready" ? link.url : "";

  const copy = async () => {
    if (!(url && navigator?.clipboard?.writeText)) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the link stays selectable in the field.
    }
  };

  if (link.status === "error") {
    return (
      <p className="text-destructive text-sm">
        Couldn't create a share link. Please try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Share link"
            className="pl-9"
            readOnly
            value={link.status === "ready" ? link.url : "Creating link…"}
          />
        </div>
        <Button
          disabled={link.status !== "ready"}
          onClick={copy}
          type="button"
          variant="outline"
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-muted-foreground text-xs">Share to</p>
        <div className="grid grid-cols-4 gap-2">
          {SOCIALS.map((social) => (
            <Button
              asChild
              // `disabled` does nothing on an <a>; while the link is minting
              // these must be visibly and actually inert.
              className={cn(
                "h-11 w-full",
                url ? "" : "pointer-events-none opacity-50"
              )}
              key={social.label}
              variant="outline"
            >
              <a
                aria-disabled={url ? undefined : true}
                aria-label={`Share to ${social.label}`}
                href={url ? social.href(url, title) : undefined}
                rel="noopener noreferrer"
                target="_blank"
              >
                <social.Icon className="size-4" />
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
