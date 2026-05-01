import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await prisma.shoppingList.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const list = await prisma.shoppingList.update({
    where: { id: params.id },
    data: { name: body.name },
    include: { items: true },
  });
  return NextResponse.json(list);
}
