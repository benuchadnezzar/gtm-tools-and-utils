export type IntakeRequest = {
  title: string;
  problem: string;
  desiredOutcome: string;
};

export function isIntakeRequest(value: unknown): value is IntakeRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.title === "string" &&
    typeof candidate.problem === "string" &&
    typeof candidate.desiredOutcome === "string" &&
    candidate.title.trim().length > 0 &&
    candidate.problem.trim().length > 0 &&
    candidate.desiredOutcome.trim().length > 0
  );
}
