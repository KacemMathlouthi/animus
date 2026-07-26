import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

/** App toast surface — mount once near the root, call `toast()` from anywhere.
 * Follows the app theme and inherits our shadcn tokens so toasts match the rest
 * of the UI out of the box. */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      theme={theme as ToasterProps["theme"]}
      {...props}
    />
  );
}
