import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HomeChartsSection } from "@/components/home/HomeChartsSection";
import { HomeFooterCta } from "@/components/home/HomeFooterCta";
import { HomeHero } from "@/components/home/HomeHero";
import { LearningCycleSection } from "@/components/home/LearningCycleSection";
import { ParentValueSection } from "@/components/home/ParentValueSection";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F9FAFB] to-[#EEF2FF]">
      <HomeHero />
      <LearningCycleSection />
      <FeaturesSection />
      <ParentValueSection />
      <HomeChartsSection />
      <HomeFooterCta />
      <footer className="mt-auto border-t border-slate-200/70 bg-white/90 px-4 py-8 text-center text-xs leading-relaxed text-slate-500 backdrop-blur-sm sm:px-6">
        <p>國二理化第二次段考預習觀看系統 v2｜影片與AI學習診斷</p>
      </footer>
    </div>
  );
}
