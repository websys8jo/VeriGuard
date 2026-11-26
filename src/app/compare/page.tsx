import { FilterBar } from "@/components/FilterBar";
import { ComparePageView } from "@/components/p2/ComparePageView";

export default function ComparePage() {
  return (
    <div className="flex h-full flex-col">
      <FilterBar />
      <div className="flex-1 overflow-hidden">
        <ComparePageView />
      </div>
    </div>
  );
}
