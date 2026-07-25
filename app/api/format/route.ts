import { NextResponse } from "next/server";

import { getClaudeClient } from "@/lib/claude";
import { isIntakeRequest } from "@/lib/intake";
import { FORMAT_USER_STORY } from "@/lib/prompts/format-user-story";

export const runtime = "nodejs";

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
          name: "user_story",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
              },
              role: {
                type: "string",
              },
              goal: {
                type: "string",
              },
              benefit: {
                type: "string",
              },
              acceptanceCriteria: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    given: {
                      type: "string",
                    },
                    when: {
                      type: "string",
                    },
                    then: {
                      type: "string",
                    },
                  },
                  required: ["given", "when", "then"],
                  additionalProperties: false,
                },
              },
              internalQuestions: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              needsSplitting: {
                type: "boolean",
              },
              splittingReason: {
                type: "string",
              },
            },
            required: [
              "title",
              "role",
              "goal",
              "benefit",
              "acceptanceCriteria",
              "internalQuestions",
              "needsSplitting",
              "splittingReason",
            ],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: FORMAT_USER_STORY,
        },
        {
          role: "user",
          content: JSON.stringify(intake),
        },
      ],
    });

    const text = message.choices[0]?.message?.content;

    if (!text) {
      throw new Error("Claude did not return a user story.");
    }

    const userStory = JSON.parse(text) as UserStoryResult;

    return NextResponse.json(userStory);
  } catch (error) {
    console.error("Claude user story formatting failed:", error);

    return NextResponse.json(
      { error: "The user story could not be created." },
      { status: 502 },
    );
  }
}
