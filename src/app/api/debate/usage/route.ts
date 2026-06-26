import { getStats } from "@/lib/api-tracker";

export async function GET() {
  return Response.json(getStats());
}
