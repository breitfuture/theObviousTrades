// /frontend/src/app/positions/page.tsx
import PositionsTable from "../../components/PositionsTable";
export default function PositionsPage() {
  return (
    <main className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-semibold">Positions</h1>
      <PositionsTable />
    </main>
  );
}
