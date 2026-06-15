import { CallToAction } from "@/components/landing/cta";
import { FaqsSection } from "@/components/landing/faqs";
import { FeatureSection } from "@/components/landing/feature-section";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Integrations } from "@/components/landing/integrations";

export function LandingPage() {
	return (
		<div className="min-h-svh overflow-x-clip bg-background" id="top">
			<Header />
			<main>
				<HeroSection />
				<FeatureSection />
				<HowItWorks />
				<Integrations />
				<FaqsSection />
				<CallToAction />
			</main>
			<Footer />
		</div>
	);
}
