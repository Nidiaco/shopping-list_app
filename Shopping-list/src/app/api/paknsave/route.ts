import { searchPaknsave } from "@/lib/paknsave";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const products = await searchPaknsave(query);
  return NextResponse.json(products);
}
