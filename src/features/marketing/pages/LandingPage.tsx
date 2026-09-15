import { useEffect } from 'react';
import '@/styles/marketing.css';
import { Nav } from '../components/Nav';
import { Hero } from '../components/Hero';
import { Testimonials } from '../components/Testimonials';
import { Connect } from '../components/Connect';
import { Features } from '../components/Features';
import { Pricing } from '../components/Pricing';
import { MobileBanner } from '../components/MobileBanner';
import { Faq } from '../components/Faq';
import { Footer } from '../components/Footer';

/** Public marketing page at `/`. Signed-in users are redirected to their dashboard by the route. */
export function LandingPage() {
	useEffect(() => {
		document.title = 'Ledge Desk · One desk for support, field work & projects';
		document.documentElement.classList.add('landing');
		return () => {
			document.documentElement.classList.remove('landing');
			document.title = 'Ledge Desk';
		};
	}, []);

	return (
		<div className="min-h-full overflow-x-clip bg-white text-t1">
			<a href="#product" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-pop">
				Skip to content
			</a>
			<Nav />
			<main>
				<Hero />
				<Testimonials />
				<Connect />
				<Features />
				<Pricing />
				<MobileBanner />
				<Faq />
			</main>
			<Footer />
		</div>
	);
}
