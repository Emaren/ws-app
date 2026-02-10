import { NextRequest, NextResponse } from "next/server";
import { WsApiHttpError, wsApiRegister } from "@/lib/wsApiAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string }
    | null;

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password required" },
      { status: 400 },
    );
  }

  try {
    const result = await wsApiRegister(email, password, name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WsApiHttpError) {
      return NextResponse.json(
        { message: error.message, details: error.payload },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { message: "Registration request failed" },
      { status: 502 },
    );
  }
}
