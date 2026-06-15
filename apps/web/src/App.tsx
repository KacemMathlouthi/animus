import { BrowserRouter, Route, Routes } from "react-router";
import { AuthPage } from "@/pages/auth-page";
import { LandingPage } from "@/pages/landing-page";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<LandingPage />} path="/" />
				<Route element={<AuthPage />} path="/auth" />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
