import { BookOpen } from "lucide-react";

export function AuthBrandMark({ theme }: { theme: "dark" | "light" }) {
  const titleColor = theme === "dark" ? "text-white" : "text-[#123044]";
  const subtitleColor = theme === "dark" ? "text-[#afc7d1]" : "text-[#78909a]";

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#0e7490] sm:size-[38px] sm:rounded-[10px]">
        <BookOpen aria-hidden="true" className="size-[18px] text-[#071b24] sm:size-5" strokeWidth={2} />
      </div>
      <div>
        <p className={`text-sm font-bold leading-[18px] tracking-[0.02em] sm:text-[15px] sm:leading-5 ${titleColor}`}>
          EDUTRACK COE
        </p>
        <p className={`mt-px text-[11px] font-medium leading-[15px] sm:text-xs sm:leading-4 ${subtitleColor}`}>
          Ruang belajar digital
        </p>
      </div>
    </div>
  );
}
