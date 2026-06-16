import { BrowserRouter, Route, Routes } from "react-router";
import { AuthPage } from "@/pages/auth-page";
import { LandingPage } from "@/pages/landing-page";
import { StudioPage } from "@/pages/studio-page";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<LandingPage />} path="/" />
				<Route element={<AuthPage />} path="/auth" />
				<Route element={<StudioPage />} path="/studio" />
				<Route element={<StudioPage />} path="/studio/c/:chatId" />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
