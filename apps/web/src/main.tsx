import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import App from "./App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="animus-theme">
			<App />
			<Toaster position="bottom-right" />
		</ThemeProvider>
	</StrictMode>,
);
