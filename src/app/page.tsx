import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HomeChartsSection } from "@/components/home/HomeChartsSection";
import { HomeFooterCta } from "@/components/home/HomeFooterCta";
import { HeroSection } from "@/components/home/HeroSection";
import { LearningCycleSection } from "@/components/home/LearningCycleSection";
import { ParentValueSection } from "@/components/home/ParentValueSection";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <HeroSection />
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <LearningCycleSection />
        <FeaturesSection />
        <ParentValueSection />
        <HomeChartsSection />
        <HomeFooterCta />
        <footer className="border-t border-white/10 bg-slate-950/90 px-4 py-8 text-center text-xs leading-relaxed text-slate-500 backdrop-blur-sm sm:px-6">
          <p>國中理化 AI 智慧學習測試系統｜名貫補習班</p>
        </footer>
      </div>
    </div>
  );
}
