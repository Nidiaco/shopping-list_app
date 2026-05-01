import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const lists = await prisma.shoppingList.findMany({
    include: {
      items: {
        orderBy: [{ checked: "asc" }, { category: "asc" }, { createdAt: "desc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(request: Request) {
  const body = await request.json();
  const list = await prisma.shoppingList.create({
    data: { name: body.name || "New List" },
    include: { items: true },
  });
  return NextResponse.json(list);
}
