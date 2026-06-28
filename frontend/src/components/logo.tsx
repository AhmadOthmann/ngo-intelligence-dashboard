export function Logo({
  className = "",
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverse";
}) {
  const titleClass = tone === "inverse" ? "text-white" : "text-foreground";
  const subtitleClass = tone === "inverse" ? "text-white/60" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
        <img
          src="/impact-atlas-logo.jpeg"
          alt="Impact Atlas"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="leading-tight">
        <div className={`text-base font-semibold tracking-tight ${titleClass}`}>
          Impact Atlas
        </div>
        <div className={`text-[10px] uppercase tracking-wider ${subtitleClass}`}>
          NGO intelligence
        </div>
      </div>
    </div>
  );
}
