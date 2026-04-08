import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VisualizationJoin, VisualizationLane, VisualizationSource, VisualizationStep } from "@/lib/types";

const STEP_ACCENTS: Record<string, string> = {
  with: "from-sky-500/20 via-cyan-500/10 to-transparent border-sky-400/40",
  from: "from-indigo-500/20 via-blue-500/10 to-transparent border-indigo-400/40",
  join: "from-violet-500/20 via-fuchsia-500/10 to-transparent border-violet-400/40",
  where: "from-amber-500/20 via-yellow-500/10 to-transparent border-amber-400/40",
  group_by: "from-emerald-500/20 via-green-500/10 to-transparent border-emerald-400/40",
  having: "from-lime-500/20 via-green-500/10 to-transparent border-lime-400/40",
  select: "from-blue-500/20 via-cyan-500/10 to-transparent border-blue-400/40",
  distinct: "from-orange-500/20 via-amber-500/10 to-transparent border-orange-400/40",
  window: "from-pink-500/20 via-rose-500/10 to-transparent border-pink-400/40",
  order_by: "from-slate-500/20 via-zinc-500/10 to-transparent border-slate-400/40",
  limit_offset: "from-red-500/20 via-orange-500/10 to-transparent border-red-400/40",
  returning: "from-teal-500/20 via-cyan-500/10 to-transparent border-teal-400/40",
};

function splitFocusParts(focus: string): string[] {
  return focus
    .split(/\s+\|\s+|,\s+(?=(?:[^()]*\([^()]*\))*[^()]*$)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function StepGlyph({ stepKey }: { stepKey: string }) {
  const label = {
    with: "CTE",
    from: "SRC",
    join: "JOIN",
    where: "FLT",
    group_by: "GRP",
    having: "CHK",
    select: "OUT",
    distinct: "UNQ",
    window: "WIN",
    order_by: "ORD",
    limit_offset: "LIM",
    returning: "RET",
  }[stepKey] ?? "SQL";

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/80 text-[11px] font-semibold tracking-[0.18em] text-slate-700 shadow-sm">
      {label}
    </div>
  );
}

function DataTile({
  title,
  lines,
  tone = "default",
  compact = false,
}: {
  title: string;
  lines: string[];
  tone?: "default" | "active" | "muted" | "source" | "detail" | string;
  compact?: boolean;
}) {
  const toneClasses = {
    default: "border-slate-200 bg-white/80 text-slate-700",
    active: "border-blue-300 bg-blue-50/80 text-blue-900",
    muted: "border-slate-200/70 bg-slate-100/70 text-slate-500",
    source: "border-indigo-200 bg-indigo-50/80 text-indigo-900",
    detail: "border-amber-200 bg-amber-50/80 text-amber-900",
  };

  return (
    <div
      className={cn(
        "min-w-[120px] rounded-2xl border p-3 shadow-sm",
        toneClasses[tone as keyof typeof toneClasses] ?? toneClasses.default,
        compact ? "space-y-1" : "space-y-2",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="space-y-1">
        {lines.map((line) => (
          <div key={line} className={cn("rounded-lg px-2 py-1", compact ? "text-[11px]" : "text-xs", tone === "muted" ? "bg-white/60" : "bg-white/90")}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArrowFlow() {
  return (
    <div className="flex items-center justify-center px-1 text-slate-400">
      <div className="h-px w-6 bg-current" />
      <div className="-ml-1 h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-current" />
    </div>
  );
}

function LaneDiagram({ lanes }: { lanes: VisualizationLane[] }) {
  const visibleLanes = lanes.filter((lane) => lane.items.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {visibleLanes.map((lane, index) => (
        <div key={`${lane.label}-${index}`} className="flex items-center gap-3">
          <DataTile title={lane.label} lines={lane.items} tone={lane.tone} compact={lane.items.length > 3} />
          {index < visibleLanes.length - 1 && <ArrowFlow />}
        </div>
      ))}
    </div>
  );
}

function StepDiagram({ step }: { step: VisualizationStep }) {
  if (step.lanes.length > 0) {
    return <LaneDiagram lanes={step.lanes} />;
  }

  const parts = splitFocusParts(step.focus);

  switch (step.key) {
    case "from":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Sources" lines={parts.length ? parts.slice(0, 3) : ["table_a", "table_b"]} />
          <ArrowFlow />
          <DataTile title="Working Set" lines={["all source rows", "available columns"]} tone="active" />
        </div>
      );
    case "join":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Left" lines={["base rows"]} />
          <div className="rounded-full border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800">
            join on {parts[0] ?? "condition"}
          </div>
          <DataTile title="Right" lines={parts.slice(1, 3).length ? parts.slice(1, 3) : ["related rows"]} />
          <ArrowFlow />
          <DataTile title="Merged Rows" lines={["matched columns", "combined row shape"]} tone="active" />
        </div>
      );
    case "where":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Incoming Rows" lines={["candidate row", "candidate row", "candidate row"]} />
          <ArrowFlow />
          <DataTile title="Predicate" lines={parts.slice(0, 2).length ? parts.slice(0, 2) : ["condition"]} compact tone="muted" />
          <ArrowFlow />
          <DataTile title="Rows Kept" lines={["matching row", "matching row"]} tone="active" />
        </div>
      );
    case "group_by":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Rows" lines={["row", "row", "row", "row"]} compact />
          <ArrowFlow />
          <DataTile title="Buckets" lines={parts.length ? parts.slice(0, 3) : ["group key"]} tone="active" />
          <ArrowFlow />
          <DataTile title="Aggregates" lines={["COUNT(...)", "SUM(...)", "AVG(...)"]} compact />
        </div>
      );
    case "having":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Grouped Results" lines={["group A", "group B", "group C"]} />
          <ArrowFlow />
          <DataTile title="HAVING Check" lines={parts.slice(0, 2).length ? parts.slice(0, 2) : ["aggregate condition"]} compact tone="muted" />
          <ArrowFlow />
          <DataTile title="Groups Kept" lines={["group A", "group C"]} tone="active" />
        </div>
      );
    case "select":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Working Set" lines={["available row shape"]} />
          <ArrowFlow />
          <DataTile title="Output Columns" lines={parts.length ? parts.slice(0, 4) : ["*"]} tone="active" />
        </div>
      );
    case "distinct":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Projected Rows" lines={["row A", "row A", "row B"]} />
          <ArrowFlow />
          <DataTile title="Distinct Output" lines={["row A", "row B"]} tone="active" />
        </div>
      );
    case "window":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Rows" lines={["row 1", "row 2", "row 3"]} />
          <ArrowFlow />
          <DataTile title="Window Frame" lines={parts.slice(0, 2).length ? parts.slice(0, 2) : ["OVER (...)"]} compact tone="muted" />
          <ArrowFlow />
          <DataTile title="Rows + Metrics" lines={["row 1 + rank", "row 2 + running total"]} tone="active" />
        </div>
      );
    case "order_by":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Unsorted" lines={["row 3", "row 1", "row 2"]} />
          <ArrowFlow />
          <DataTile title="Sort Key" lines={parts.slice(0, 3).length ? parts.slice(0, 3) : ["column ASC"]} compact tone="muted" />
          <ArrowFlow />
          <DataTile title="Sorted Output" lines={["row 1", "row 2", "row 3"]} tone="active" />
        </div>
      );
    case "limit_offset":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Sorted Rows" lines={["1", "2", "3", "4", "5"]} compact />
          <ArrowFlow />
          <DataTile title="Slice" lines={parts.length ? parts : ["LIMIT n", "OFFSET m"]} compact tone="muted" />
          <ArrowFlow />
          <DataTile title="Returned Rows" lines={["2", "3", "4"]} compact tone="active" />
        </div>
      );
    case "with":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="CTE Definitions" lines={parts.length ? parts.slice(0, 3) : ["cte_name AS (...)"]} />
          <ArrowFlow />
          <DataTile title="Named Result Sets" lines={["temp dataset", "reusable input"]} tone="active" />
        </div>
      );
    case "returning":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Affected Rows" lines={["updated row", "updated row"]} />
          <ArrowFlow />
          <DataTile title="RETURNING" lines={parts.length ? parts.slice(0, 4) : ["id", "status"]} tone="active" />
        </div>
      );
    default:
      return (
        <div className="flex flex-wrap items-center gap-3">
          <DataTile title="Operation" lines={parts.length ? parts.slice(0, 4) : [step.focus]} tone="active" />
        </div>
      );
  }
}

function StepFocusChips({ focus }: { focus: string }) {
  const parts = splitFocusParts(focus);

  return (
    <div className="flex flex-wrap gap-2">
      {(parts.length ? parts : [focus]).map((part) => (
        <span
          key={part}
          className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
        >
          {part}
        </span>
      ))}
    </div>
  );
}

function ExecutionPipeline({ steps }: { steps: VisualizationStep[] }) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Execution Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={`${step.key}-${index}`} className="flex min-w-max items-center gap-3">
              <div className="min-w-[180px] rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Step {index + 1}</span>
                  <StepGlyph stepKey={step.key} />
                </div>
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <div className="mt-2 line-clamp-2 text-xs text-slate-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && <ArrowFlow />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceNode({ source, active = false }: { source: VisualizationSource; active?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-[170px] rounded-3xl border p-4 shadow-sm",
        active ? "border-indigo-300 bg-indigo-50/85" : "border-slate-200 bg-white/90",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{source.kind}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{source.name}</div>
      <div className="mt-2 text-xs text-slate-500">{source.alias ? `alias: ${source.alias}` : "alias: none"}</div>
    </div>
  );
}

function OutputPreview({
  columns,
  statementType,
}: {
  columns: string[];
  statementType: string;
}) {
  const visibleColumns = columns.length ? columns.slice(0, 6) : ["result"];

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Output Shape</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}>
            {visibleColumns.map((column) => (
              <div key={column} className="border-r border-slate-700 px-3 py-2 last:border-r-0">
                {column}
              </div>
            ))}
          </div>
          <div className="grid bg-white text-xs text-slate-600" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}>
            {visibleColumns.map((column) => (
              <div key={column} className="border-r border-t border-slate-200 px-3 py-3 last:border-r-0">
                {statementType === "SELECT" ? "value" : "affected"}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QueryMap({
  sources,
  joins,
  filters,
  groups,
  orderBy,
  outputColumns,
  statementType,
}: {
  sources: VisualizationSource[];
  joins: VisualizationJoin[];
  filters: string[];
  groups: string[];
  orderBy: string[];
  outputColumns: string[];
  statementType: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <Card className="overflow-hidden border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.9))] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Source Graph</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {(sources.length ? sources : [{ name: "result", alias: null, kind: "query" }]).map((source, index) => (
              <div key={`${source.name}-${source.alias ?? "base"}-${index}`} className="flex items-center gap-3">
                <SourceNode source={source} active={index === 0} />
                {(index < sources.length - 1 || joins[index]) && <ArrowFlow />}
              </div>
            ))}
          </div>

          {joins.length > 0 && (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/75 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Join Edges</div>
              {joins.map((join) => (
                <div key={`${join.join_type}-${join.target}-${join.condition ?? "none"}`} className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3">
                  <div className="text-xs font-semibold text-violet-900">
                    {join.join_type} {"->"} {join.target}
                    {join.alias ? ` (${join.alias})` : ""}
                  </div>
                  <div className="mt-1 text-xs text-violet-700">{join.condition ?? "No explicit join condition"}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <DataTile title="Filters" lines={filters.length ? filters : ["none"]} tone="detail" compact />
            <DataTile title="Groups" lines={groups.length ? groups : ["none"]} tone="source" compact />
            <DataTile title="Order" lines={orderBy.length ? orderBy : ["none"]} tone="active" compact />
          </div>
        </CardContent>
      </Card>

      <OutputPreview columns={outputColumns} statementType={statementType} />
    </div>
  );
}

export function VisualizationBoard({
  steps,
  statementType,
  normalizedQuery,
  sources,
  joins,
  outputColumns,
  filters,
  groups,
  orderBy,
}: {
  steps: VisualizationStep[];
  statementType: string;
  normalizedQuery: string;
  sources: VisualizationSource[];
  joins: VisualizationJoin[];
  outputColumns: string[];
  filters: string[];
  groups: string[];
  orderBy: string[];
}) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-slate-200/80 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(255,255,255,0.95)_32%,rgba(16,185,129,0.08))]">
        <CardHeader className="pb-4">
          <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
            <span>Query Flow Diagram</span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {statementType}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Normalized SQL</div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-700">{normalizedQuery}</pre>
          </div>
          <QueryMap
            sources={sources}
            joins={joins}
            filters={filters}
            groups={groups}
            orderBy={orderBy}
            outputColumns={outputColumns}
            statementType={statementType}
          />
          <ExecutionPipeline steps={steps} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card
            key={`${step.key}-${index}`}
            className={cn(
              "overflow-hidden border bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.98))] shadow-sm",
              STEP_ACCENTS[step.key] ?? "border-slate-200",
            )}
          >
            <CardContent className="grid gap-5 p-5 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                    {index + 1}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StepGlyph stepKey={step.key} />
                      <div>
                        <div className="text-base font-semibold text-slate-900">{step.title}</div>
                        <div className="text-sm text-slate-500">{step.description}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Focused SQL</div>
                  <StepFocusChips focus={step.focus} />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.82))] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Data Transformation</div>
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    visual stage
                  </div>
                </div>
                <StepDiagram step={step} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
