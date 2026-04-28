import LandingNavbar from '../Ui/LandingNavbar';
import Hero from '../Ui/Hero';
import Duality from '../Ui/Duality';
import Workflow from '../Ui/Workflow';
import FeatureGrid from '../Ui/FeatureGrid';
import ProductPreview from '../Ui/ProductPreview';
import UseCases from '../Ui/UseCases';
import FinalCTA from '../Ui/FinalCTA';
import LandingFooter from '../Ui/LandingFooter';

export default function LandingPage() {
  return (
    <div className="bg-[#09090b] min-h-screen selection:bg-zinc-100 selection:text-black">
      <LandingNavbar />
      <Hero />
      <Duality />
      <Workflow />
      <FeatureGrid />
      <ProductPreview />
      <UseCases />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}