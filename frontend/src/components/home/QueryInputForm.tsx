import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Dialect, QueryExample } from "@/lib/types";

interface QueryInputFormProps {
  dialect: Dialect;
  supportedDialects: Dialect[];
  examples: QueryExample[];
  query: string;
  loading: boolean;
  onDialectChange: (dialect: Dialect) => void;
  onExampleSelect: (name: string) => void;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function QueryInputForm({
  dialect,
  supportedDialects,
  examples,
  query,
  loading,
  onDialectChange,
  onExampleSelect,
  onQueryChange,
  onSubmit,
}: QueryInputFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Run analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="dialect">Dialect</Label>
            <Select id="dialect" value={dialect} onChange={(event) => onDialectChange(event.target.value as Dialect)}>
              {supportedDialects.map((supported) => (
                <option key={supported} value={supported}>
                  {supported === "postgres" ? "PostgreSQL" : "SQL (PostgreSQL-compatible)"}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="example">Quick examples</Label>
            <Select id="example" onChange={(event) => onExampleSelect(event.target.value)} defaultValue="">
              <option value="" disabled>
                Pick an example query
              </option>
              {examples.map((example) => (
                <option key={example.name} value={example.name}>
                  {example.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query">SQL Query</Label>
            <Textarea id="query" rows={12} value={query} onChange={(event) => onQueryChange(event.target.value)} />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Processing..." : "Validate + Parse + Explain + Visualize"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
