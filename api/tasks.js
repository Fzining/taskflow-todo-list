import { get, put } from "@vercel/blob";

const DEFAULT_SPACE = "default";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export default async function handler(request, response) {
  setHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method === "GET") {
    await getTasks(request, response);
    return;
  }

  if (request.method === "PUT") {
    await putTasks(request, response);
    return;
  }

  response.status(405).json({ error: "Method not allowed" });
}

async function getTasks(request, response) {
  try {
    const blob = await get(tasksPath(request), { access: "private", useCache: false });
    if (!blob?.stream) {
      response.status(200).json({ tasks: [], updatedAt: 0 });
      return;
    }

    const text = await new Response(blob.stream).text();
    response.status(200).json(normalizePayload(JSON.parse(text)));
  } catch (error) {
    if (isNotFound(error)) {
      response.status(200).json({ tasks: [], updatedAt: 0 });
      return;
    }

    response.status(500).json({ error: "Unable to load tasks" });
  }
}

async function putTasks(request, response) {
  try {
    const payload = normalizePayload(await parseBody(request));
    payload.updatedAt = Date.now();

    await put(tasksPath(request), JSON.stringify(payload), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });

    response.status(200).json(payload);
  } catch {
    response.status(500).json({ error: "Unable to save tasks" });
  }
}

function setHeaders(response) {
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
}

function tasksPath(request) {
  const url = new URL(request.url || "/api/tasks", "https://taskflow.local");
  const rawSpace = url.searchParams.get("space") || DEFAULT_SPACE;
  const space = rawSpace.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || DEFAULT_SPACE;
  return `taskflow/${space}/tasks.json`;
}

async function parseBody(request) {
  if (typeof request.body === "object" && request.body !== null) return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizePayload(payload) {
  return {
    tasks: Array.isArray(payload?.tasks) ? payload.tasks : [],
    updatedAt: Number(payload?.updatedAt || 0),
  };
}

function isNotFound(error) {
  return error?.name === "BlobNotFoundError" || error?.status === 404 || error?.statusCode === 404;
}
