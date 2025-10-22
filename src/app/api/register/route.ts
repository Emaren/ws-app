// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "User already exists" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hash,
      name: email.split("@")[0],
      role: "STONEHOLDER",
    },
  });

  return NextResponse.json({ message: "User created" }, { status: 201 });
}
