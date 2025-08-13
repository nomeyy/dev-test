import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password)
      return new Response(JSON.stringify({ error: "missing" }), {
        status: 400,
      });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return new Response(JSON.stringify({ error: "invalid credentials" }), {
        status: 401,
      });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok)
      return new Response(JSON.stringify({ error: "invalid credentials" }), {
        status: 401,
      });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return new Response(
      JSON.stringify({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      }),
      { status: 200 },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server" }), { status: 500 });
  }
}
