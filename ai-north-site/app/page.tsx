import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import ServicesSection from '@/components/ServicesSection';
import ProcessSection from '@/components/ProcessSection';
import FAQSection from '@/components/FAQSection';
import ContactSection from '@/components/ContactSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import LogoTicker from '@/components/LogoTicker';
import TerminalDemo from '@/components/TerminalDemo';
import ShowcaseSection from '@/components/ShowcaseSection';
import CustomCursor from '@/components/CustomCursor';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#020817] overflow-x-hidden">
      {/* Loading screen */}
      <LoadingScreen />

      {/* Custom cursor */}
      <CustomCursor />

      {/* Global ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-[#00d4ff]/3 blur-[150px]" />
      </div>

      <Navigation />
      <HeroSection />
      <StatsSection />
      {/* Logo ticker after stats */}
      <LogoTicker />
      <ServicesSection />
      {/* Terminal demo between services and process */}
      <TerminalDemo />
      <ProcessSection />
      {/* Showcase section */}
      <ShowcaseSection />
      <FAQSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </main>
  );
}
