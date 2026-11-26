"use client";

import { motion } from "framer-motion";
import { diverging, gradientCss, textOn } from "@/lib/p2/colorScale";

export interface HeatCell {
  value: number | null; // normalized 0-1, null = no data
  display: string; // what to print in the cell
  sub?: string; // small secondary line (e.g. n=123)
  title?: string; // hover tooltip
}

interface Props {
  rows: { id: string; label: string }[];
  cols: { id: string; label: string; badge?: string }[];
  cornerLabel?: string;
  cell: (rowId: string, colId: string) => HeatCell | undefined;
  selected?: { row: string; col: string } | null;
  onSelectCell?: (rowId: string, colId: string) => void;
  skip?: (rowId: string, colId: string) => boolean; // true = render as blank slot (e.g. lower triangle)
  rowHeaderWidth?: number;
  minColWidth?: number;
}

export function Heatmap({
  rows,
  cols,
  cornerLabel,
  cell,
  selected,
  onSelectCell,
  skip,
  rowHeaderWidth = 128,
  minColWidth = 64,
}: Props) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `${rowHeaderWidth}px repeat(${cols.length}, minmax(${minColWidth}px, 1fr))` }}
    >
      <div className="flex items-end pb-1 text-[10px] text-neutral-400">{cornerLabel}</div>
      {cols.map((c) => (
        <div key={c.id} className="flex flex-col items-start justify-end gap-1 pb-1">
          {c.badge && (
            <span className="rounded bg-neutral-200 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {c.badge}
            </span>
          )}
          <div className="line-clamp-2 text-[11px] leading-tight text-neutral-600 dark:text-neutral-300" title={c.label}>
            {c.label}
          </div>
        </div>
      ))}

      {rows.map((r, ri) => (
        <RowCells
          key={r.id}
          row={r}
          cols={cols}
          rowIndex={ri}
          cell={cell}
          selected={selected}
          onSelectCell={onSelectCell}
          skip={skip}
        />
      ))}
    </div>
  );
}

function RowCells({
  row,
  cols,
  rowIndex,
  cell,
  selected,
  onSelectCell,
  skip,
}: {
  row: { id: string; label: string };
  cols: { id: string; label: string }[];
  rowIndex: number;
  cell: Props["cell"];
  selected: Props["selected"];
  onSelectCell: Props["onSelectCell"];
  skip: Props["skip"];
}) {
  return (
    <>
      <div className="flex items-center text-xs font-medium text-neutral-700 dark:text-neutral-300">{row.label}</div>
      {cols.map((c, ci) => {
        if (skip?.(row.id, c.id)) {
          return <div key={c.id} />;
        }
        const data = cell(row.id, c.id);
        const isSelected = selected?.row === row.id && selected?.col === c.id;

        if (!data || data.value === null) {
          return (
            <div
              key={c.id}
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-200 text-[10px] text-neutral-300 dark:border-neutral-800 dark:text-neutral-700"
            >
              –
            </div>
          );
        }

        const bg = diverging(data.value);
        const fg = textOn(bg);

        return (
          <motion.button
            key={c.id}
            type="button"
            title={data.title}
            onClick={() => onSelectCell?.(row.id, c.id)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: (rowIndex * cols.length + ci) * 0.012, ease: "easeOut" }}
            whileHover={{ scale: 1.1, zIndex: 2, boxShadow: "0 8px 20px rgba(0,0,0,0.22)" }}
            whileTap={{ scale: 0.97 }}
            style={{ background: bg, color: fg }}
            className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg font-mono tabular-nums ${
              isSelected ? "ring-2 ring-accent ring-offset-1 ring-offset-white dark:ring-offset-neutral-950" : ""
            }`}
          >
            <span className="text-[13px] font-semibold">{data.display}</span>
            {data.sub && <span className="text-[9px] opacity-80">{data.sub}</span>}
          </motion.button>
        );
      })}
    </>
  );
}

export function HeatmapLegend({ lowLabel, highLabel, caption }: { lowLabel: string; highLabel: string; caption: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
      <span>{caption}</span>
      <span className="font-mono">{lowLabel}</span>
      <span className="h-2.5 w-24 rounded-full" style={{ background: gradientCss() }} />
      <span className="font-mono">{highLabel}</span>
    </div>
  );
}
