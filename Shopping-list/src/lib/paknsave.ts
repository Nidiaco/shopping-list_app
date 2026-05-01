export interface PaknsaveProduct {
  name: string;
  price: number;
  unitPrice?: string;
  size?: string;
  imageUrl?: string;
}

const PAKNSAVE_WAINONI_STORE_ID = "4e1075e1-46ee-43bf-8baa-26599ee0ad6f";

export async function searchPaknsave(
  query: string
): Promise<PaknsaveProduct[]> {
  try {
    const res = await fetch(
      `https://www.paknsave.co.nz/next/api/products/search?q=${encodeURIComponent(query)}&s=16&pg=1&storeId=${PAKNSAVE_WAINONI_STORE_ID}&publish=true&inStockProductsOnly=false`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-NZ,en;q=0.9",
          Referer: "https://www.paknsave.co.nz/shop/search",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      console.error(`Pak'nSave search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const products = data?.data?.products?.items || data?.products?.items || [];

    return products.slice(0, 8).map((p: any) => ({
      name: p.name || p.description || "Unknown",
      price: p.price?.salePrice ?? p.price?.originalPrice ?? p.price ?? 0,
      unitPrice: p.price?.unitPriceStr || p.unitPrice || undefined,
      size: p.size || p.displaySize || undefined,
      imageUrl: p.images?.big || p.images?.small || undefined,
    }));
  } catch (error) {
    console.error("Pak'nSave search error:", error);
    return [];
  }
}
