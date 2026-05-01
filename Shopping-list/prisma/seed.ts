import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const list = await prisma.shoppingList.create({
    data: {
      name: "Weekly Groceries",
      items: {
        create: [
          { name: "Milk", quantity: 2, category: "Dairy" },
          { name: "Bread", quantity: 1, category: "Bakery" },
          { name: "Bananas", quantity: 6, category: "Produce" },
          { name: "Chicken Breast", quantity: 1, category: "Meat" },
          { name: "Rice", quantity: 1, category: "Pantry" },
          { name: "Dish Soap", quantity: 1, category: "Cleaning" },
        ],
      },
    },
  });

  console.log(`Created shopping list: ${list.name} (${list.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
