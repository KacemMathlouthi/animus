import { BrowserRouter, Outlet, Route, Routes } from "react-router";
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
							<Outlet />
						</RequireAuth>
					}
				>
					<Route element={<StudioPage />} path="/studio" />
					<Route element={<StudioPage />} path="/studio/c/:chatId" />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
