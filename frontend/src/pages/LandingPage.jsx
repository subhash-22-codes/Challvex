import LandingNavbar from '../Ui/Ux/LandingNavbar';
import Hero from '../Ui/Ux/Hero';
import Duality from '../Ui/Ux/Duality';
import Workflow from '../Ui/Ux/Workflow';
import FeatureGrid from '../Ui/Ux/FeatureGrid';
import ProductPreview from '../Ui/Ux/ProductPreview';
import UseCases from '../Ui/Ux/UseCases';
import FinalCTA from '../Ui/Ux/FinalCTA';
import LandingFooter from '../Ui/Ux/LandingFooter';

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