import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, slug: true },
  });
  console.log(`Total products in database: ${allProducts.length}`);
  const testProducts = allProducts.filter(
    (x) =>
      x.name.includes('Expiring') ||
      x.name.includes('Test') ||
      x.slug.startsWith('test-') ||
      x.slug.startsWith('expire-') ||
      x.slug.startsWith('concur-')
  );
  console.log(`Test products found: ${testProducts.length}`);
  for (const tp of testProducts) {
    console.log(`Deleting test product: ${tp.name} (${tp.slug})`);
    await prisma.cartItem.deleteMany({ where: { variant: { productId: tp.id } } });
    await prisma.orderItem.deleteMany({ where: { variant: { productId: tp.id } } });
    await prisma.favourite.deleteMany({ where: { productId: tp.id } });
    await prisma.productVariant.deleteMany({ where: { productId: tp.id } });
    await prisma.productReview.deleteMany({ where: { productId: tp.id } });
    await prisma.product.delete({ where: { id: tp.id } });
  }
  console.log('Cleanup finished.');
}

main().finally(() => prisma.$disconnect());
