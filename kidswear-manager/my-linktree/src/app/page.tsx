import {
  GitBranch,
  Camera,
  Globe,
  Briefcase,
  X,
  Mail,
  LucideIcon,
} from "lucide-react";
import LinkCard from "@/components/LinkCard";
import linksData from "@/data/links.json";

const iconMap: Record<string, LucideIcon> = {
  GitBranch,
  Camera,
  Globe,
  Briefcase,
  X,
  Mail,
};

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm flex flex-col items-center gap-3">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 ring-2 ring-white/20 shadow-xl mb-1" />

        {/* Name & bio */}
        <h1 className="text-white text-xl font-bold tracking-tight">Your Name</h1>
        <p className="text-white/50 text-sm mb-3">Full Stack Developer · Creator</p>

        {/* Cards */}
        {linksData.map((link) => {
          const icon = iconMap[link.icon];
          if (!icon) return null;
          return (
            <LinkCard
              key={link.title}
              title={link.title}
              url={link.url}
              description={link.description}
              icon={icon}
            />
          );
        })}
      </div>
    </main>
  );
}
