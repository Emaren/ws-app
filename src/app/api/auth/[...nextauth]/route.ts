// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Make sure this API route is never statically generated.
// This avoids the dev error about generating static paths and chunk resolution.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
