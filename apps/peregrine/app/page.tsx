"use client";

import React, { useState } from "react";

type IntakeRequest = {
  title: string;
  problem: string;
  desiredOutcome: string;
};

type ReviewResult = {
  ready: boolean;
  followUpQuestions: Array<{
    field: keyof IntakeRequest;
    question: string;
  }>;
};

type UserStoryResult = {
  title: string;
  role: string;
  goal: string;
  benefit: string;
  acceptanceCriteria: Array<{
    given: string;
    when: string;
    then: string;
  }>;
  internalQuestions: string[];
  needsSplitting: boolean;
  splittingReason: string;
};

type AsanaSubmissionResult = {
  taskGid: string;
  taskName: string;
  taskUrl: string;
};

type ProcessingStage = "idle" | "reviewing" | "formatting";

const emptyRequest: IntakeRequest = {
  title: "",
  problem: "",
  desiredOutcome: "",
};

export default function Home() {
  const [request, setRequest] = useState(emptyRequest);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [userStory, setUserStory] = useState<UserStoryResult | null>(null);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTask, setSubmittedTask] =
    useState<AsanaSubmissionResult | null>(null);
  const [submissionError, setSubmissionError] = useState("");
  const [error, setError] = useState("");

  const isProcessing = processingStage !== "idle";

  function updateRequest(field: keyof IntakeRequest, value: string) {
    setRequest((currentRequest) => ({
      ...currentRequest,
      [field]: value,
    }));

    setReview((currentReview) => (currentReview?.ready ? null : currentReview));
    setUserStory(null);
    setSubmittedTask(null);
    setSubmissionError("");
    setError("");
  }

  async function handleReview(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setProcessingStage("reviewing");
    setReview(null);
    setUserStory(null);
    setError("");

    try {
      const reviewResponse = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!reviewResponse.ok) {
        throw new Error("We couldn't review your request. Please try again.");
      }

      const reviewResult = (await reviewResponse.json()) as ReviewResult;
      setReview(reviewResult);

      if (!reviewResult.ready) {
        return;
      }

      setProcessingStage("formatting");

      const formatResponse = await fetch("/api/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!formatResponse.ok) {
        throw new Error(
          "Your request passed review, but we couldn't create the user story.",
        );
      }

      const formattedStory = (await formatResponse.json()) as UserStoryResult;

      setUserStory(formattedStory);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setProcessingStage("idle");
    }
  }

  async function handleAsanaSubmission() {
    if (!userStory || submittedTask) {
      return;
    }

    try {
      const response = await fetch("/api/asana", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intake: request,
          userStory,
        }),
      });

      const result = (await response.json()) as
        AsanaSubmissionResult | { error?: string };

      if (!response.ok) {
        const failure = result as { error?: string };

        throw new Error(
          failure.error ?? "The request could not be submitted to Asana.",
        );
      }

      setSubmittedTask(result as AsanaSubmissionResult);
    } catch (error) {
      if (error instanceof Error) {
        setSubmissionError("The request could not be submitted to Asana.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold text-slate-900">
          Submit a request
        </h1>

        <p className="mt-2 text-slate-600">
          Tell us what you need and why it matters.
        </p>

        <form
          onSubmit={handleReview}
          className="mt-8 space-y-6 rounded-xl bg-white p-8 shadow-sm"
        >
          <label className="block">
            <span className="font-medium text-slate-900">Request title</span>
            <input
              value={request.title}
              onChange={(event) => updateRequest("title", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
              required
            />
          </label>

          <label className="block">
            <span className="font-medium text-slate-900">
              What problem are you trying to solve?
            </span>

            <textarea
              value={request.problem}
              onChange={(event) => updateRequest("problem", event.target.value)}
              className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 p-3"
              required
            />
          </label>

          <label className="block">
            <span className="font-medium text-slate-900">
              What outcome are you hoping for?
            </span>

            <textarea
              value={request.desiredOutcome}
              onChange={(event) =>
                updateRequest("desiredOutcome", event.target.value)
              }
              className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 p-3"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isProcessing || submittedTask !== null}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            {submittedTask
              ? "Submitted to Asana"
              : processingStage === "reviewing"
                ? "Reviewing..."
                : processingStage === "formatting"
                  ? "Creating user story..."
                  : "Review my request"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 p-4 text-red-900">{error}</p>
          )}

          {review?.ready && !userStory && (
            <div className="rounded-lg bg-green-50 p-4 text-green-900">
              <h2 className="font-semibold">Please wait.</h2>

              <p className="mt-1">
                We&apos;re creating one or more user stories from your request.
                Please read and approve before exiting the page.
              </p>
            </div>
          )}

          {review && !review.ready && (
            <div className="rounded-lg bg-amber-50 p-4 text-amber-950">
              <h2 className="font-semibold">Please add a little more detail</h2>

              <ul className="mt-3 list-disc space-y-2 pl-5">
                {review.followUpQuestions.map((item) => (
                  <li key={`${item.field}-${item.question}`}>
                    {item.question}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {userStory && (
            <section className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-6">
              <div>
                <p>User story preview</p>
                <h2 className="m1 text-xl font-semibold text-slate-900">
                  {userStory.title}
                </h2>
              </div>

              <div className="space-y-2 text-slate-800">
                <p>
                  <strong>As a</strong> {userStory.role}
                </p>

                <p>
                  <strong>I want to</strong> {userStory.goal}
                </p>

                <p>
                  <strong>So that</strong> {userStory.benefit}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Acceptance criteria
                </h3>
                <ol className="mt-3 space-y-4">
                  {userStory.acceptanceCriteria.map((criterion, index) => (
                    <li
                      key={`${criterion.given}-${index}`}
                      className="rounded-lg bg-white p-4"
                    >
                      <p>
                        <strong>Given</strong> {criterion.given}
                      </p>

                      <p className="mt-1">
                        <strong>When</strong> {criterion.when}
                      </p>

                      <p className="mt-1">
                        <strong>Then</strong> {criterion.then}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-slate-200 pt-5">
                {!submittedTask && (
                  <div>
                    <p className="text-sm text-slate-600">
                      Review the user story above before submitting it.
                    </p>

                    <button
                      type="button"
                      onClick={handleAsanaSubmission}
                      disabled={isSubmitting}
                      className="mt-3 rounded-lg bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting
                        ? "Submitting to Asana..."
                        : "Submit to Asana"}
                    </button>
                  </div>
                )}

                {submissionError && (
                  <p className="mt-3 rounded-lg bg-red-50 p-4 text-red-900">
                    {submissionError}
                  </p>
                )}

                {submittedTask && (
                  <div className="rounded-lg bg-green-50 p-4 text-green-900">
                    <h3 className="font-semibold">
                      Request submitted successfully
                    </h3>

                    <p className="mt-1">
                      Your request was added to the Marketing Operations
                      Requests Asana project. The team reviews and prioritizes
                      new requests each Monday.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </form>
      </div>
    </main>
  );
}
