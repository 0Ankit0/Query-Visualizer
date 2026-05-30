import { FormEvent, useEffect, useMemo, useState } from "react";

import { ExplainPanel, ErrorPanel, ParsePanel, ValidationPanel } from "@/components/home/AnalysisPanels";
import { QueryInputForm } from "@/components/home/QueryInputForm";
import { StepCard } from "@/components/StepCard";
import { VisualizationBoard } from "@/components/VisualizationBoard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { explainQuery, fetchDialects, fetchExamples, parseQuery, validateQuery, visualizeQuery } from "@/lib/api";
import type { Dialect, ExplainAnalysis, ParseResponse, QueryExample, ValidationResponse, VisualizationResponse } from "@/lib/types";

const FALLBACK_QUERY = `SELECT c.name, COUNT(o.id) AS total_orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= '2026-01-01'
GROUP BY c.name
HAVING COUNT(o.id) > 5
ORDER BY total_orders DESC
LIMIT 10;`;

export default function App() {
  const [dialect, setDialect] = useState<Dialect>("postgres");
  const [query, setQuery] = useState(FALLBACK_QUERY);
  const [supportedDialects, setSupportedDialects] = useState<Dialect[]>(["postgres", "sql"]);
  const [examples, setExamples] = useState<QueryExample[]>([]);

  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [visualization, setVisualization] = useState<VisualizationResponse | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainAnalysis | null>(null);

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const [dialectsResponse, examplesResponse] = await Promise.all([fetchDialects(), fetchExamples()]);
      setSupportedDialects(dialectsResponse.dialects);
      setExamples(examplesResponse.examples);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load API metadata.");
    }
  }

  const examplesForDialect = useMemo(
    () => examples.filter((example) => example.dialect === dialect),
    [examples, dialect],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = { query, dialect };
      const [validationResponse, parseResponse, explainResponse, visualizeResponse] = await Promise.all([
        validateQuery(payload),
        parseQuery(payload),
        explainQuery(payload),
        visualizeQuery(payload),
      ]);

      setValidation(validationResponse);
      setParseResult(parseResponse);
      setExplainResult(explainResponse.explain_analysis);
      setVisualization(visualizeResponse);
    } catch (err) {
      setValidation(null);
      setParseResult(null);
      setExplainResult(null);
      setVisualization(null);
      setError(err instanceof Error ? err.message : "Unexpected request error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 pb-10 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Database Query Visualizer</CardTitle>
          <CardDescription>
            Validate, parse, and visualize SQL execution flow for PostgreSQL and PostgreSQL-compatible SQL.
          </CardDescription>
        </CardHeader>
      </Card>

      <QueryInputForm
        dialect={dialect}
        supportedDialects={supportedDialects}
        examples={examplesForDialect}
        query={query}
        loading={loading}
        onDialectChange={setDialect}
        onExampleSelect={(name) => {
          const selected = examplesForDialect.find((item) => item.name === name);
          if (selected) {
            setQuery(selected.query);
          }
        }}
        onQueryChange={setQuery}
        onSubmit={onSubmit}
      />

      <ErrorPanel message={error} />
      <ValidationPanel validation={validation} />
      <ParsePanel parseResult={parseResult} />
      <ExplainPanel explain={explainResult} />

      {visualization && (
        <section className="space-y-4">
          <VisualizationBoard
            steps={visualization.steps}
            statementType={visualization.statement_type}
            normalizedQuery={visualization.normalized_query}
            sources={visualization.sources}
            joins={visualization.joins}
            outputColumns={visualization.output_columns}
            filters={visualization.filters}
            groups={visualization.groups}
            orderBy={visualization.order_by}
          />

          <Card>
            <CardHeader>
              <CardTitle>Step Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Statement type:</strong> {visualization.statement_type}
              </p>
              <p>
                <strong>Normalized query:</strong>
                <br />
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{visualization.normalized_query}</code>
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {visualization.steps.map((step, index) => <StepCard key={`${step.key}-${index}`} step={step} index={index} />)}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {visualization.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
