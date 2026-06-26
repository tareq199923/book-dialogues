import { NextRequest } from "next/server";
import { debates, runDebate } from "@/lib/debate/orchestrator";
import { SSEEvent } from "@/lib/debate/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return new Response("Missing debate id", { status: 400 });
  }

  const state = debates.get(id);
  if (!state) {
    return new Response("Debate not found", { status: 404 });
  }

  const isReconnect = state.turns.length > 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: SSEEvent) {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
      }

      try {
        for await (const event of runDebate(
          state.personaA,
          state.personaB,
          state.maxTurns,
          state.id,
          isReconnect ? state : undefined
        )) {
          sendEvent(event);
        }
      } catch (err) {
        sendEvent({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown streaming error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
