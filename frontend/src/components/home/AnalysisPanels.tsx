import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExplainAnalysis, ParseResponse, ValidationResponse } from "@/lib/types";

export function ErrorPanel({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <Card className="border-destructive/40 bg-destructive/10">
      <CardContent className="p-4 text-sm">
        <strong>Error:</strong> {message}
      </CardContent>
    </Card>
  );
}

export function ValidationPanel({ validation }: { validation: ValidationResponse | null }) {
  if (!validation) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <strong>Status:</strong> {validation.is_valid ? "Valid SQL" : "Invalid SQL"}
        </p>
        {validation.normalized_query && (
          <p>
            <strong>Normalized query:</strong>
            <br />
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{validation.normalized_query}</code>
          </p>
        )}
        {!validation.is_valid && validation.errors.length > 0 && (
          <ul className="list-inside list-disc">
            {validation.errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ParsePanel({ parseResult }: { parseResult: ParseResponse | null }) {
  if (!parseResult) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parse Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <strong>Statement type:</strong> {parseResult.statement_type}
        </p>
        <p>
          <strong>AST SQL (compact):</strong>
          <br />
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{parseResult.ast_sql}</code>
        </p>
      </CardContent>
    </Card>
  );
}

function PlanTreeNode({
  node,
}: {
  node: NonNullable<ExplainAnalysis["root_node"]>;
}) {
  return (
    <li className="space-y-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <div className="font-semibold">{node.node_type}{node.relation_name ? ` on ${node.relation_name}` : ""}</div>
        <div className="mt-1 text-slate-500">
          {node.actual_rows !== null && node.actual_rows !== undefined ? `rows=${node.actual_rows}` : "rows=n/a"}
          {" | "}
          {node.actual_total_time !== null && node.actual_total_time !== undefined
            ? `time=${node.actual_total_time.toFixed(3)}ms`
            : "time=n/a"}
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-4 space-y-2 border-l border-slate-200 pl-4">
          {node.children.map((child, index) => (
            <PlanTreeNode
              key={`${child.node_type}-${child.relation_name ?? "node"}-${index}`}
              node={child}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ExplainPanel({ explain }: { explain: ExplainAnalysis | null }) {
  if (!explain) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PostgreSQL EXPLAIN ANALYZE</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          <strong>Status:</strong> {explain.available ? "Live plan available" : "Unavailable (fallback mode)"}
        </p>
        <p>
          <strong>Summary:</strong> {explain.summary}
        </p>

        {explain.root_node && (
          <div className="space-y-2">
            <p className="font-semibold">Plan tree</p>
            <ul className="space-y-2">
              <PlanTreeNode node={explain.root_node} />
            </ul>
          </div>
        )}

        {explain.plan_lines.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold">Plan outline</p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {explain.plan_lines.join("\n")}
            </pre>
          </div>
        )}

        {explain.tips.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold">Optimization tips</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {explain.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
