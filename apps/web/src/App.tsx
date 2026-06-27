import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AccountSection } from "@/features/settings/components/account-section";
import { GenerationSection } from "@/features/settings/components/generation-section";
import { SecretsSection } from "@/features/settings/components/secrets-section";
import { SettingsLayout } from "@/features/settings/components/settings-layout";
import { AuthPage } from "@/pages/auth-page";
import { LandingPage } from "@/pages/landing-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { SharePage } from "@/pages/share-page";
import { StudioPage } from "@/pages/studio-page";
import { TermsPage } from "@/pages/terms-page";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<LandingPage />} path="/" />
				<Route element={<AuthPage />} path="/auth" />
				<Route element={<TermsPage />} path="/terms" />
				<Route element={<PrivacyPage />} path="/privacy" />
				<Route element={<SharePage />} path="/v/:token" />
				<Route
					element={
						<RequireAuth>
							<Outlet />
						</RequireAuth>
					}
				>
					<Route element={<StudioPage />} path="/studio" />
					<Route element={<StudioPage />} path="/studio/c/:chatId" />
					<Route element={<SettingsLayout />} path="/settings">
						<Route
							element={<Navigate replace to="/settings/account" />}
							index
						/>
						<Route element={<AccountSection />} path="account" />
						<Route element={<GenerationSection />} path="generation" />
						<Route element={<SecretsSection />} path="secrets" />
					</Route>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
