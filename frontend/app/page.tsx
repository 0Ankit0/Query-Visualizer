"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { StepCard } from "@/components/StepCard";
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
    <main>
      <h1>Database Query Visualizer</h1>
      <p>
        Validate, parse, and visualize SQL execution flow for PostgreSQL and generic SQL. This view is optimized for new SQL learners.
      </p>

      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="dialect">Dialect</label>
        <select id="dialect" value={dialect} onChange={(event) => setDialect(event.target.value as Dialect)}>
          {supportedDialects.map((supported) => (
            <option key={supported} value={supported}>
              {supported === "postgres" ? "PostgreSQL" : "SQL (generic)"}
            </option>
          ))}
        </select>

        <label htmlFor="example" style={{ marginTop: "1rem", display: "block" }}>
          Quick examples
        </label>
        <select
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
        </select>

        <label htmlFor="query" style={{ marginTop: "1rem", display: "block" }}>
          SQL Query
        </label>
        <textarea id="query" rows={12} value={query} onChange={(event) => setQuery(event.target.value)} />

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Validate + Parse + Visualize"}
        </button>
      </form>

      {error && (
        <section className="card error-card" style={{ marginTop: "1rem" }}>
          <strong>Error:</strong> {error}
        </section>
      )}

      {validation && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <h2>Validation</h2>
          <p>
            <strong>Status:</strong> {validation.is_valid ? "Valid SQL" : "Invalid SQL"}
          </p>
          {validation.normalized_query && (
            <p>
              <strong>Normalized query:</strong>
              <br />
              <code>{validation.normalized_query}</code>
            </p>
          )}
          {!validation.is_valid && validation.errors.length > 0 && (
            <ul>
              {validation.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {parseResult && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <h2>Parse Details</h2>
          <p>
            <strong>Statement type:</strong> {parseResult.statement_type}
          </p>
          <p>
            <strong>AST SQL (compact):</strong>
            <br />
            <code>{parseResult.ast_sql}</code>
          </p>
        </section>
      )}

      {visualization && (
        <section style={{ marginTop: "1rem" }}>
          <div className="card">
            <h2>Visualization</h2>
            <p>
              <strong>Statement type:</strong> {visualization.statement_type}
            </p>
            <p>
              <strong>Normalized Query</strong>
              <br />
              <code>{visualization.normalized_query}</code>
            </p>
          </div>

          <div className="steps">
            {visualization.steps.map((step, index) => (
              <StepCard key={`${step.key}-${index}`} step={step} index={index} />
            ))}
          </div>

          <section className="card" style={{ marginTop: "1rem" }}>
            <h3>Notes</h3>
            <ul>
              {visualization.notes.map((note) => (
                <li key={note} className="note">
                  {note}
                </li>
              ))}
            </ul>
          </section>
        </section>
      )}
    </main>
  );
}
