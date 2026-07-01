import { CallToAction } from "@/features/landing/components/cta";
import { FaqsSection } from "@/features/landing/components/faqs";
import { FeatureSection } from "@/features/landing/components/feature-section";
import { Footer } from "@/features/landing/components/footer";
import { Header } from "@/features/landing/components/header";
import { HeroSection } from "@/features/landing/components/hero";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { UseCases } from "@/features/landing/components/use-cases";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function LandingPage() {
	useDocumentTitle();

	return (
		<div className="min-h-svh overflow-x-clip bg-background" id="top">
			<Header />
			<main>
				<HeroSection />
				<FeatureSection />
				<HowItWorks />
				<UseCases />
				<FaqsSection />
				<CallToAction />
			</main>
			<Footer />
		</div>
	);
}
