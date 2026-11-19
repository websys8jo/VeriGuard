import { FilterBar } from "@/components/FilterBar";
import { RulesView } from "@/components/p1/RulesView";

export default function RulesPage() {
  return (
    <div className="flex h-full flex-col">
      <FilterBar />
      <div className="flex-1 overflow-hidden">
        <RulesView />
      </div>
    </div>
  );
}
