import type { VisualizationStep } from "@/lib/types";

export function StepCard({ step, index }: { step: VisualizationStep; index: number }) {
  return (
    <section className="card">
      <h3>
        <span className="step-number">{index + 1}</span>
        {step.title}
      </h3>
      <p>{step.description}</p>
      <p>
        <strong>Query part:</strong> <code>{step.focus}</code>
      </p>
    </section>
  );
}
