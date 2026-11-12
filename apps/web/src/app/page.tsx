'use client';

import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Benefits } from '../components/landing/Benefits';
import { FAQ } from '../components/landing/FAQ';
import { CTA } from '../components/landing/CTA';
import { Footer } from '../components/landing/Footer';
import { AppBootLogo } from '../components/ui/app-boot-logo';

export default function Home() {
  const { loading } = useAuth();

  if (loading) {
    return <AppBootLogo />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
