export function PlaceholderBlock({
  label,
  tone = "light",
}: {
  label: string;
  tone?: "light" | "dark";
}) {
  const classes =
    tone === "dark"
      ? "border-white/15 bg-white/5 text-white/40"
      : "border-gray-300 bg-gray-50 text-gray-400";

  return (
    <div
      className={`flex min-h-40 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm ${classes}`}
    >
      {label}
    </div>
  );
}
