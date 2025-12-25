// src/components/kpi/Kpi.tsx
export function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
