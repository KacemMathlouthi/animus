import { Analytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import {
	BrowserRouter,
	Navigate,
	Outlet,
	Route,
	Routes,
	useLocation,
	useNavigationType,
} from "react-router";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AccountSection } from "@/features/settings/components/account-section";
import { GenerationSection } from "@/features/settings/components/generation-section";
import { SecretsSection } from "@/features/settings/components/secrets-section";
import { SettingsLayout } from "@/features/settings/components/settings-layout";
import { UsageSection } from "@/features/settings/components/usage-section";
import { AuthPage } from "@/pages/auth-page";
import { LandingPage } from "@/pages/landing-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { SharePage } from "@/pages/share-page";
import { StudioPage } from "@/pages/studio-page";
import { TermsPage } from "@/pages/terms-page";
import { VerifyLoginPage } from "@/pages/verify-login-page";

function ScrollToTop() {
	const location = useLocation();
	const navigationType = useNavigationType();
	useEffect(() => {
		// Back/forward: let the browser restore the previous scroll position.
		if (navigationType === "POP") {
			return;
		}
		const target = location.hash
			? document.getElementById(location.hash.slice(1))
			: null;
		if (target) {
			target.scrollIntoView();
			return;
		}
		window.scrollTo({ top: 0, behavior: "instant" });
	}, [location, navigationType]);
	return null;
}

function App() {
	return (
		<BrowserRouter>
			<ScrollToTop />
			<Routes>
				<Route element={<LandingPage />} path="/" />
				<Route element={<AuthPage />} path="/auth" />
				<Route element={<VerifyLoginPage />} path="/auth/verify" />
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
						<Route element={<UsageSection />} path="usage" />
						<Route element={<SecretsSection />} path="secrets" />
					</Route>
				</Route>
				<Route element={<NotFoundPage />} path="*" />
			</Routes>
			<Analytics />
		</BrowserRouter>
	);
}

export default App;
