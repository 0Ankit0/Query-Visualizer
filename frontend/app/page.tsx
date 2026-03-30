"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { StepCard } from "@/components/StepCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchDialects, fetchExamples, parseQuery, validateQuery, visualizeQuery } from "@/lib/api";
import type { Dialect, ParseResponse, QueryExample, ValidationResponse, VisualizationResponse } from "@/lib/types";

const FALLBACK_QUERY = `SELECT c.name, COUNT(o.id) AS total_orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= '2026-01-01'
GROUP BY c.name
HAVING COUNT(o.id) > 5
ORDER BY total_orders DESC
LIMIT 10;`;

export default function HomePage() {
  const [dialect, setDialect] = useState<Dialect>("postgres");
  const [query, setQuery] = useState(FALLBACK_QUERY);
  const [supportedDialects, setSupportedDialects] = useState<Dialect[]>(["postgres", "sql"]);
  const [examples, setExamples] = useState<QueryExample[]>([]);

  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [visualization, setVisualization] = useState<VisualizationResponse | null>(null);

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
      const [validationResponse, parseResponse, visualizeResponse] = await Promise.all([
        validateQuery(payload),
        parseQuery(payload),
        visualizeQuery(payload),
      ]);

      setValidation(validationResponse);
      setParseResult(parseResponse);
      setVisualization(visualizeResponse);
    } catch (err) {
      setValidation(null);
      setParseResult(null);
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
            Validate, parse, and visualize SQL execution flow for PostgreSQL and generic SQL.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="dialect">Dialect</Label>
              <Select id="dialect" value={dialect} onChange={(event) => setDialect(event.target.value as Dialect)}>
                {supportedDialects.map((supported) => (
                  <option key={supported} value={supported}>
                    {supported === "postgres" ? "PostgreSQL" : "SQL (generic)"}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="example">Quick examples</Label>
              <Select
                id="example"
                onChange={(event) => {
                  const selected = examplesForDialect.find((item) => item.name === event.target.value);
                  if (selected) {
                    setQuery(selected.query);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Pick an example query
                </option>
                {examplesForDialect.map((example) => (
                  <option key={example.name} value={example.name}>
                    {example.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="query">SQL Query</Label>
              <Textarea id="query" rows={12} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Validate + Parse + Visualize"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="p-4 text-sm">
            <strong>Error:</strong> {error}
          </CardContent>
        </Card>
      )}

      {validation && (
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
      )}

      {parseResult && (
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
      )}

      {visualization && (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visualization</CardTitle>
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

          <div className="grid gap-3">{visualization.steps.map((step, index) => <StepCard key={`${step.key}-${index}`} step={step} index={index} />)}</div>

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
