import { BrowserRouter, Route, Routes } from "react-router";
import { LandingPage } from "@/pages/landing-page";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<LandingPage />} path="/" />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
