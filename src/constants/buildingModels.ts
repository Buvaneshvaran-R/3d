export const BUILDING_MODEL_LINKS = {
  A: {
    sourcePage:
      "https://www.meshy.ai/s/YQpEgm",
  },
  B: {
    sourcePage:
      "https://www.meshy.ai/s/zaCrQB",
  },
  C: {
    sourcePage:
      "https://www.meshy.ai/s/p7ubMX",
  },
} as const;

export const BUILDING_STYLE = {
  A: {
    body: 0xeaf3fb,
    glass: 0x66b9ef,
    accent: 0xc62828,
  },
  B: {
    body: 0xf5f2e9,
    glass: 0x9fb3c8,
    accent: 0x8d5f3b,
  },
  C: {
    body: 0xf8f8f8,
    glass: 0xbfc8d4,
    accent: 0x4a6f9e,
  },
} as const;

export const BUILDING_MODEL_PAGE_LIST = [
  { name: "Block A 3D Model", url: BUILDING_MODEL_LINKS.A.sourcePage },
  { name: "Block B 3D Model", url: BUILDING_MODEL_LINKS.B.sourcePage },
  { name: "Block C 3D Model", url: BUILDING_MODEL_LINKS.C.sourcePage },
] as const;

export type BuildingModelKey = keyof typeof BUILDING_MODEL_LINKS;
