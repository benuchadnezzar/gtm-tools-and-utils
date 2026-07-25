type CreateAsanaTaskInput = {
  name: string;
  notes: string;
};

export type CreatedAsanaTask = {
  gid: string;
  name: string;
  permalinkUrl: string;
};

export async function createAsanaTask(
  input: CreateAsanaTaskInput,
): Promise<CreatedAsanaTask> {
  const accessToken = process.env.ASANA_ACCESS_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID;

  if (!accessToken || !projectGid) {
    throw new Error("Asana environment variables are not configured.");
  }

  const response = await fetch(
    "https://app.asana.com/api/1.0/tasks?opt_fields=gid,name,permalink_url",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name: input.name,
          notes: input.notes,
          projects: [projectGid],
        },
      }),
    },
  );

  const responseBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Asana API error:", response.status, responseBody);
    throw new Error("Asana rejected the task creation request.");
  }

  const result = responseBody as {
    data?: {
      gid?: string;
      name?: string;
      permalink_url?: string;
    };
  };

  if (!result.data?.gid || !result.data.name || !result.data.permalink_url) {
    throw new Error("Asana returned an unexpected response.");
  }

  return {
    gid: result.data.gid,
    name: result.data.name,
    permalinkUrl: result.data.permalink_url,
  };
}
