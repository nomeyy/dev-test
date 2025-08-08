import { getAllClients } from "@/lib/sseManager";

export async function GET() {
  const clients = getAllClients();

  console.log(clients, `clients`);

  return Response.json({ clients });
}
