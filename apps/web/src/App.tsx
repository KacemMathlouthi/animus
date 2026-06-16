import { BrowserRouter, Route, Routes } from "react-router";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AuthPage } from "@/pages/auth-page";
import { LandingPage } from "@/pages/landing-page";
import { StudioPage } from "@/pages/studio-page";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<LandingPage />} path="/" />
				<Route element={<AuthPage />} path="/auth" />
				<Route
					element={
						<RequireAuth>
							<StudioPage />
						</RequireAuth>
					}
					path="/studio"
				/>
				<Route
					element={
						<RequireAuth>
							<StudioPage />
						</RequireAuth>
					}
					path="/studio/c/:chatId"
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
