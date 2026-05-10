import { Compass } from "lucide-react";
import { TOUR_CONFIG, getTourTranslations } from "../config/tour.config";
import { env } from "../config/env";

export function TourButton({ onClick }: { onClick: () => void }) {
  if (!TOUR_CONFIG.isDemoMode || !TOUR_CONFIG.showTourButton) return null;

  const t = getTourTranslations();

  return (
    <button
      data-tour-restart
      onClick={() => {
        localStorage.removeItem(`tourCompleted_${env.clientId}`);
        onClick();
      }}
      className="fixed bottom-40 end-6 z-40 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl active:scale-95 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label={t.tourButton}
      title={t.tourButton}
    >
      <Compass className="h-4 w-4" />
      <span className="hidden sm:inline">{t.tourButton}</span>
    </button>
  );
}
