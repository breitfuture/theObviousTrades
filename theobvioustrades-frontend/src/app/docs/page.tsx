import PositionsTable from "../../components/PositionsTable";
import PerformanceSummary from "../../components/PerformanceSummary";

export default function DocsPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Portfolio Dashboard</h1>
      <PerformanceSummary />
      <PositionsTable />
    </main>
  );
}
