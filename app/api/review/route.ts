import { NextResponse } from "next/server";

import { REVIEW_INTAKE } from "@/lib/prompts/review-intake";
import { getClaudeClient } from "@/lib/claude";
import { isIntakeRequest, type IntakeRequest } from "@/lib/intake";

export const runtime = "nodejs";

type ReviewResult = {
  ready: boolean;
  followUpQuestions: Array<{
    field: keyof IntakeRequest;
    question: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const intake: unknown = await request.json();

    if (!isIntakeRequest(intake)) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    const { client, model } = getClaudeClient();

    const message = await client.chat.completions.create({
      model,
      max_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ready: {
                type: "boolean",
              },
              followUpQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: {
                      type: "string",
                      enum: ["title", "problem", "desiredOutcome"],
                    },
                    question: {
                      type: "string",
                    },
                  },
                  required: ["field", "question"],
                  additionalProperties: false,
                },
              },
            },
            required: ["ready", "followUpQuestions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: REVIEW_INTAKE,
        },
        {
          role: "user",
          content: JSON.stringify(intake),
        },
      ],
    });

    const text = message.choices[0]?.message?.content;

    if (!text) {
      throw new Error("Claude did not return a review.");
    }

    const review = JSON.parse(text) as ReviewResult;

    return NextResponse.json(review);
  } catch (error) {
    console.error("Claude review failed:", error);

    return NextResponse.json(
      { error: "The AI review could not be completed." },
      { status: 502 },
    );
  }
}
