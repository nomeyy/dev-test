import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    if (!email || !password)
      return new Response(
        JSON.stringify({ error: "email and password required" }),
        { status: 400 }
      );

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return new Response(JSON.stringify({ error: "user exists" }), {
        status: 409,
      });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });
    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: user.id, email: user.email, name: user.name },
      }),
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server error" }), {
      status: 500,
    });
  }
}
