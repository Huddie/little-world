import { eq } from "drizzle-orm";
import type { Db } from "../../server/db/client";
import { characters, locations, productDeliveryOptions, products, universes } from "../../server/db/schema";

export async function getActiveCatalog(db: Db) {
  const activeUniverses = await db.select().from(universes).where(eq(universes.active, true));
  const activeProducts = await db.select().from(products).where(eq(products.active, true));
  const deliveryOptions = await db.select().from(productDeliveryOptions);
  const activeCharacters = await db.select().from(characters).where(eq(characters.active, true));
  const worldLocations = await db.select().from(locations);

  return {
    universes: activeUniverses,
    products: activeProducts.map((product) => ({
      ...product,
      deliveryOptions: deliveryOptions.filter((option) => option.productId === product.id)
    })),
    characters: activeCharacters,
    locations: worldLocations
  };
}
