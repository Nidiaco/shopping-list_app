import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const item = await prisma.item.create({
    data: {
      name: body.name,
      quantity: body.quantity || 1,
      category: body.category || "Other",
      price: body.price || null,
      paknsaveMatch: body.paknsaveMatch || null,
      shoppingListId: body.shoppingListId,
    },
  });
  return NextResponse.json(item);
}
