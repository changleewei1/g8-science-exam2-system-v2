import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HomeChartsSection } from "@/components/home/HomeChartsSection";
import { HomeFooterCta } from "@/components/home/HomeFooterCta";
import { HeroSection } from "@/components/home/HeroSection";
import { LearningCycleSection } from "@/components/home/LearningCycleSection";
import { ParentValueSection } from "@/components/home/ParentValueSection";
import { getHomeAnnouncementForPublic } from "@/lib/system-announcement";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";

export default async function Home() {
  const announcement = await getHomeAnnouncementForPublic();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <HeroSection announcement={announcement} />
      <div className="relative isolate flex min-h-0 flex-1 flex-col">
        <StudentLightTechBackground position="absolute" />
        <LearningCycleSection />
        <FeaturesSection />
        <ParentValueSection />
        <HomeChartsSection />
        <HomeFooterCta />
        <footer className="border-t border-cyan-200/35 bg-white/40 px-4 py-8 text-center text-xs leading-relaxed text-slate-500 backdrop-blur-lg sm:px-6">
          <p className="bg-gradient-to-r from-slate-600 via-cyan-800/90 to-slate-600 bg-clip-text font-medium text-transparent">
            國中理化 AI 智慧學習測試系統｜名貫補習班
          </p>
        </footer>
      </div>
    </div>
  );
}
