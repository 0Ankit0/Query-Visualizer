import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VisualizationStep } from "@/lib/types";

export function StepCard({ step, index }: { step: VisualizationStep; index: number }) {
  return (
    <Card className="border-slate-200/80 bg-white/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <Badge variant="secondary" className="h-6 w-6 justify-center rounded-full p-0">
            {index + 1}
          </Badge>
          {step.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{step.description}</p>
        <p className="text-sm">
          <strong>Focused clause:</strong>{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{step.focus}</code>
        </p>
      </CardContent>
    </Card>
  );
}
