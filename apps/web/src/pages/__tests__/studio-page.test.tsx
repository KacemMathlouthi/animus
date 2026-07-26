import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationDetail } from "@/lib/conversations";

const { createConversation, studioChat, useConversationDetail } = vi.hoisted(
  () => ({
    createConversation: vi.fn(),
    studioChat: vi.fn(),
    useConversationDetail: vi.fn(),
  })
);

// The shell brings the sidebar, the header and the credit gauge, each of which
// fetches on mount. This page's job is choosing what goes *inside* it.
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs?: { title: string }[];
    children: React.ReactNode;
  }) => (
    <div>
      <nav aria-label="breadcrumb">{breadcrumbs?.at(-1)?.title}</nav>
      {children}
    </div>
  ),
}));
vi.mock("@/components/layout/publish-target", () => ({
  useRegisterPublishTarget: vi.fn(),
}));
vi.mock("@/features/studio/hooks/use-conversation-detail", () => ({
  useConversationDetail,
}));
vi.mock("@/features/studio/hooks/use-studio-chat", () => ({
  useStudioChat: studioChat,
}));
vi.mock("@/lib/conversations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/conversations")>();
  return { ...actual, createConversation };
});

const { MemoryRouter, Route, Routes } = await import("react-router");
const { StudioPage } = await import("../studio-page.tsx");

const CHAT_ID = "conversation-1";
const SUBMIT = /submit/i;

const detail: ConversationDetail = {
  conversation: {
    id: CHAT_ID,
    title: "How Vaccines Train Immunity",
  } as ConversationDetail["conversation"],
  messages: [],
};

function chatState(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    status: "ready",
    phase: "chat",
    videoKey: undefined,
    send: vi.fn(),
    stop: vi.fn(),
    respondToTool: vi.fn(),
    error: undefined,
    retry: vi.fn(),
    ...overrides,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<StudioPage />} path="/studio" />
        <Route element={<StudioPage />} path="/studio/c/:chatId" />
      </Routes>
    </MemoryRouter>
  );
}

describe("StudioPage", () => {
  beforeEach(() => {
    localStorage.clear();
    createConversation.mockReset();
    createConversation.mockResolvedValue({ id: CHAT_ID });
    useConversationDetail.mockReset();
    useConversationDetail.mockReturnValue({ detail, error: undefined });
    studioChat.mockReset();
    studioChat.mockReturnValue(chatState());
  });

  describe("without a conversation id", () => {
    it("offers the empty state and titles the page", async () => {
      renderAt("/studio");

      expect(
        await screen.findByRole("heading", {
          name: "What do you want to understand?",
        })
      ).toBeInTheDocument();
      expect(document.title).toBe("New video · animus");
    });

    it("creates a conversation from a typed prompt", async () => {
      renderAt("/studio");

      const box = await screen.findByRole("textbox", {
        name: "Message the agent",
      });
      await userEvent.type(box, "Explain the Fourier transform");
      await userEvent.click(screen.getByRole("button", { name: SUBMIT }));

      await waitFor(() => expect(createConversation).toHaveBeenCalledTimes(1));
    });

    it("does not create a conversation from whitespace", async () => {
      renderAt("/studio");

      const box = await screen.findByRole("textbox", {
        name: "Message the agent",
      });
      await userEvent.type(box, "   ");

      // The submit button stays disabled, so there is nothing to click.
      expect(screen.getByRole("button", { name: SUBMIT })).toBeDisabled();
      expect(createConversation).not.toHaveBeenCalled();
    });

    it("replays a prompt stashed before sign-in", async () => {
      // The landing page stashes this when a signed-out visitor submits.
      localStorage.setItem(
        "animus:pending-prompt",
        JSON.stringify({ text: "Explain entropy", at: Date.now() })
      );

      renderAt("/studio");

      await waitFor(() => expect(createConversation).toHaveBeenCalledTimes(1));
    });

    it("surfaces a failure to create the conversation", async () => {
      createConversation.mockRejectedValue(new Error("500"));
      localStorage.setItem(
        "animus:pending-prompt",
        JSON.stringify({ text: "Explain entropy", at: Date.now() })
      );

      renderAt("/studio");

      expect(
        await screen.findByText("Could not create a conversation. Try again.")
      ).toBeInTheDocument();
    });
  });

  describe("with a conversation id", () => {
    it("shows the loading state until the detail arrives", () => {
      useConversationDetail.mockReturnValue({
        detail: undefined,
        error: undefined,
      });

      renderAt(`/studio/c/${CHAT_ID}`);

      expect(
        screen.queryByRole("textbox", { name: "Message the agent" })
      ).not.toBeInTheDocument();
      expect(document.title).toBe("New video · animus");
    });

    it("renders the conversation title in the breadcrumb and the document", async () => {
      renderAt(`/studio/c/${CHAT_ID}`);

      await waitFor(() =>
        expect(document.title).toBe("How Vaccines Train Immunity · animus")
      );
      expect(screen.getByLabelText("breadcrumb")).toHaveTextContent(
        "How Vaccines Train Immunity"
      );
    });

    it("passes the router-state prompt through to the chat hook", async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: `/studio/c/${CHAT_ID}`,
              state: { prompt: "Explain the Fourier transform" },
            },
          ]}
        >
          <Routes>
            <Route element={<StudioPage />} path="/studio/c/:chatId" />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() =>
        expect(studioChat).toHaveBeenCalledWith(
          expect.objectContaining({
            chatId: CHAT_ID,
            initialPrompt: "Explain the Fourier transform",
          })
        )
      );
    });

    it("shows a not-found message when the conversation cannot be loaded", async () => {
      useConversationDetail.mockReturnValue({
        detail: undefined,
        error: new Error("404"),
      });

      renderAt(`/studio/c/${CHAT_ID}`);

      expect(
        await screen.findByText("Conversation not found.")
      ).toBeInTheDocument();
      expect(document.title).toBe("Conversation not found · animus");
    });
  });
});
