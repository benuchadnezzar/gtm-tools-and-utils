import { NextResponse } from "next/server";

import { createAsanaTask } from "@/lib/asana";
import { isIntakeRequest, type IntakeRequest } from "@/lib/intake";

export const runtime = "nodejs";

type AcceptanceCriterion = {
  given: string;
  when: string;
  then: string;
};

type UserStoryResult = {
  title: string;
  role: string;
  goal: string;
  benefit: string;
  acceptanceCriteria: AcceptanceCriterion[];
  internalQuestions: string[];
  needsSplitting: boolean;
  splittingReason: string;
};

type AsanaSubmission = {
  intake: IntakeRequest;
  userStory: UserStoryResult;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAcceptanceCriterion(value: unknown): value is AcceptanceCriterion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const criterion = value as Record<string, unknown>;

  return (
    hasText(criterion.given) &&
    hasText(criterion.when) &&
    hasText(criterion.then)
  );
}

function isUserStoryResult(value: unknown): value is UserStoryResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const story = value as Record<string, unknown>;

  return (
    hasText(story.title) &&
    hasText(story.role) &&
    hasText(story.goal) &&
    hasText(story.benefit) &&
    Array.isArray(story.acceptanceCriteria) &&
    story.acceptanceCriteria.length > 0 &&
    story.acceptanceCriteria.every(isAcceptanceCriterion) &&
    Array.isArray(story.internalQuestions) &&
    story.internalQuestions.every((question) => typeof question === "string") &&
    typeof story.needsSplitting === "boolean" &&
    typeof story.splittingReason === "string"
  );
}

function isAsanaSubmission(value: unknown): value is AsanaSubmission {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const submission = value as Record<string, unknown>;

  return (
    isIntakeRequest(submission.intake) &&
    isUserStoryResult(submission.userStory)
  );
}

function buildTaskNotes(submission: AsanaSubmission): string {
  const { intake, userStory } = submission;

  const acceptanceCriteria = userStory.acceptanceCriteria.flatMap(
    (criterion, index) => [
      `${index + 1}. Given ${criterion.given}`,
      ` When ${criterion.when}`,
      ` Then ${criterion.then}`,
    ],
  );

  const internalQuestions =
    userStory.internalQuestions.length > 0
      ? [
          "",
          "INTERNAL REFINEMENT QUESTIONS",
          "",
          ...userStory.internalQuestions.map(
            (question, index) => `${index + 1}. ${question}`,
          ),
        ]
      : [];

  const splittingNote = userStory.needsSplitting
    ? ["", "STORY SPLITTING NOTE", "", userStory.splittingReason]
    : [];

  return [
    "USER STORY",
    "",
    `As a ${userStory.role}`,
    `I want to ${userStory.goal}`,
    `So that ${userStory.benefit}`,
    "",
    "ACCEPTANCE CRITERIA",
    "",
    ...acceptanceCriteria,
    ...internalQuestions,
    ...splittingNote,
    "",
    "ORIGINAL REQUEST",
    "",
    `Request title: ${intake.title}`,
    "",
    "Problem:",
    intake.problem,
    "",
    "Desired outcome:",
    intake.desiredOutcome,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const submission: unknown = await request.json();

    if (!isAsanaSubmission(submission)) {
      return NextResponse.json(
        { error: "A valid request and user story are required." },
        { status: 400 },
      );
    }

    const task = await createAsanaTask({
      name: submission.userStory.title,
      notes: buildTaskNotes(submission),
    });

    return NextResponse.json(
      {
        taskGid: task.gid,
        taskName: task.name,
        taskUrl: task.permalinkUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Asana submission failed:", error);

    return NextResponse.json(
      { error: "The request could not be submitted to Asana." },
      { status: 502 },
    );
  }
}
