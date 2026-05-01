import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const item = await prisma.item.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
