import { RefreshCwIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Shows a branded panel instead of React's blank screen. A crashed tree is in
 * an unknown state, so recovery is a hard navigation rather than a reset.
 * Reporting goes to the console until a real error tracker lands. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No error tracker wired yet; the console is the only sink.
    console.error("[animus] uncaught render error", error, info.componentStack);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  private readonly handleHome = (): void => {
    window.location.assign("/");
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="default">
              <LogoMark className="h-20" />
            </EmptyMedia>
            <EmptyTitle>Something broke</EmptyTitle>
            <EmptyDescription>
              An unexpected error interrupted the page. Reloading usually fixes
              it. If it keeps happening, let us know.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={this.handleReload}>
                <RefreshCwIcon data-icon="inline-start" />
                Reload
              </Button>
              <Button onClick={this.handleHome} variant="outline">
                Go home
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
}
