/** Family → order (for silhouettes), Dex set, and art lookup. */
import type { TaxonCatalogEntry } from "./taxa";

export type Order = "beetle" | "mayfly" | "stonefly" | "caddis" | "fly-larva" | "crustacean" | "snail" | "worm" | "leech";

/** Full ink-and-watercolour plates in /art/families (Dex “premium” tier). */
export const PLATE_FAMILIES = [
  "Chironomidae", "Baetidae", "Elmidae", "Heptageniidae", "Leuctridae",
  "Simuliidae", "Rhyacophilidae", "Hydropsychidae", "Gammaridae",
] as const;

/** Top 40 families by Wales KiEco prevalence — collectible Dex cards (silhouette or plate). */
export const DEX_FAMILIES = [
  "Chironomidae", "Baetidae", "Elmidae", "Heptageniidae", "Leuctridae",
  "Simuliidae", "Rhyacophilidae", "Hydropsychidae", "Gammaridae",
  "Sericostomatidae", "Hydrachnidae", "Limnephilidae", "Empididae", "Hydrobiidae",
  "Ephemerellidae", "Perlodidae", "Planariidae", "Nemouridae", "Asellidae",
  "Glossosomatidae", "Ceratopogonidae", "Dytiscidae", "Hydraenidae", "Caenidae",
  "Pediciidae", "Lepidostomatidae", "Tipulidae", "Erpobdellidae", "Gyrinidae",
  "Hydroptilidae", "Polycentropodidae", "Goeridae", "Chloroperlidae", "Leptoceridae",
  "Glossiphoniidae", "Taeniopterygidae", "Lumbricidae", "Leptophlebiidae", "Tateidae",
  "Odontoceridae",
  // Tray CV often returns these even when KiEco kick-sample counts are low:
  "Staphylinidae", "Hydrophilidae", "Scirtidae", "Muscidae",
] as const;

const PLATES = new Set<string>(PLATE_FAMILIES);
const DEX_SET = new Set<string>(DEX_FAMILIES);

const g = (order: Order, names: string) => names.split(" ").map((n) => [n, order] as const);

/**
 * Order silhouette per family. Groups outside the plated Dex set use the nearest
 * shape (dragonflies → mayfly nymph, bugs and mites → beetle, flatworms → leech,
 * pea mussels → snail, aquatic moths and alderflies → caddis larva).
 * null = not a freshwater invertebrate (fish, birds, terrestrial strays): hidden from family lists.
 */
export const FAMILY_ORDER: Record<string, Order | null> = Object.fromEntries([
  ...g("beetle", "Elmidae Dytiscidae Hydraenidae Gyrinidae Hydrophilidae Scirtidae Haliplidae Curculionidae Dryopidae Helophoridae Chrysomelidae Noteridae Staphylinidae Hygrobiidae Spercheidae Aphelocheiridae Veliidae Gerridae Corixidae Notonectidae Hydrometridae Nepidae Mesoveliidae Naucoridae Pleidae Hebridae Hydrachnidae Halacaridae Neoacaridae Argyronetidae"),
  ...g("mayfly", "Baetidae Heptageniidae Ephemerellidae Caenidae Leptophlebiidae Ephemeridae Siphlonuridae Potamanthidae Ameletidae Cordulegastridae Calopterygidae Coenagrionidae Platycnemididae Aeshnidae Libellulidae Lestidae"),
  ...g("stonefly", "Leuctridae Perlodidae Nemouridae Chloroperlidae Taeniopterygidae Perlidae Capniidae"),
  ...g("caddis", "Rhyacophilidae Hydropsychidae Sericostomatidae Limnephilidae Glossosomatidae Lepidostomatidae Hydroptilidae Polycentropodidae Goeridae Leptoceridae Odontoceridae Psychomyiidae Philopotamidae Brachycentridae Beraeidae Phryganeidae Molannidae Apataniidae Rhyacophiloidea Sialidae Sisyridae Osmylidae Pyralidae Crambidae"),
  ...g("fly-larva", "Chironomidae Simuliidae Empididae Ceratopogonidae Pediciidae Tipulidae Limoniidae Psychodidae Muscidae Athericidae Dixidae Rhagionidae Tabanidae Stratiomyidae Dolichopodidae Culicidae Ptychopteridae Ephydridae Thaumaleidae Sciomyzidae Chaoboridae Syrphidae Scathophagidae Bibionidae"),
  ...g("crustacean", "Gammaridae Asellidae Crangonyctidae Niphargidae Astacidae Mysidae Pseudoniphargidae Crangonidae Palaemonidae Sphaeromatidae Holopediidae"),
  ...g("snail", "Hydrobiidae Tateidae Bithyniidae Amnicolidae Viviparidae Sphaeriidae"),
  ...g("worm", "Lumbricidae Gordiidae Hydridae"),
  ...g("leech", "Erpobdellidae Glossiphoniidae Piscicolidae Hirudinidae Haemopidae Planariidae Dugesiidae Dendrocoelidae Prostomatidae"),
  ...["Cottidae", "Nemacheilidae", "Cyprinidae", "Salmonidae", "Anguillidae", "Gasterosteidae", "Petromyzontidae", "Pleuronectidae",
    "Cinclidae", "Alcedinidae", "Ichneumonidae", "Ceraphronidae", "Aphididae", "Sminthuridae", "Poduridae", "Trichocercidae"].map((n) => [n, null] as const),
]);

export const orderOf = (family: string): Order => FAMILY_ORDER[family] ?? "worm";
export const isInvertebrate = (family: string) => FAMILY_ORDER[family] !== null;
export const hasArt = (family: string) => PLATES.has(family);
export const isDexFamily = (family: string) => DEX_SET.has(family);
export const slugOf = (family: string) => family.toLowerCase();

export type Sensitivity = "EPT" | "Sensitive" | "Tolerant" | null;
export function sensitivityOf(entry?: TaxonCatalogEntry): Sensitivity {
  switch ((entry?.sensitivity ?? "").toLowerCase()) {
    case "ept": return "EPT";
    case "sensitive": return "Sensitive";
    case "tolerant": return "Tolerant";
    default: return null;
  }
}

/** Volunteer-friendly names where the catalog only repeats the Latin name. */
const COMMON_NAMES: Record<string, string> = {
  Sericostomatidae: "Horn-cased caddis", Hydrachnidae: "Water mites", Limnephilidae: "Cased caddis", Empididae: "Dance fly larvae",
  Hydrobiidae: "Mud snails", Ephemerellidae: "Blue-winged olives", Perlodidae: "Perlodid stoneflies", Planariidae: "Flatworms",
  Nemouridae: "Brown stoneflies", Asellidae: "Water hoglouse", Glossosomatidae: "Saddle-case caddis", Ceratopogonidae: "Biting midges",
  Dytiscidae: "Diving beetles", Hydraenidae: "Minute moss beetles", Caenidae: "Caenid mayflies", Pediciidae: "Hairy-eyed craneflies",
  Lepidostomatidae: "Square-cased caddis", Tipulidae: "Craneflies", Erpobdellidae: "Worm leeches", Gyrinidae: "Whirligig beetles",
  Hydroptilidae: "Micro caddis", Polycentropodidae: "Trumpet-net caddis", Goeridae: "Goerid caddis", Chloroperlidae: "Yellow sallies",
  Leptoceridae: "Long-horned caddis", Glossiphoniidae: "Glossiphoniid leeches", Taeniopterygidae: "Winter stoneflies", Lumbricidae: "Earthworms",
  Leptophlebiidae: "Prong-gilled mayflies", Tateidae: "Jenkins’ spire snail", Odontoceridae: "Odontocerid caddis", Ephemeridae: "Burrowing mayflies",
  Limoniidae: "Limoniid craneflies", Psychodidae: "Moth fly larvae", Psychomyiidae: "Tube-making caddis", Hydrophilidae: "Water scavenger beetles",
  Perlidae: "Large stoneflies",
  Staphylinidae: "Rove beetles",
  Scirtidae: "Marsh beetles",
  Muscidae: "Muscid fly larvae", Athericidae: "Water snipe fly larvae",
  Dugesiidae: "Flatworms", Piscicolidae: "Fish leeches", Dixidae: "Meniscus midges", Sphaeriidae: "Pea mussels",
  Philopotamidae: "Finger-net caddis", Brachycentridae: "Brachycentrid caddis", Crangonyctidae: "Crangonyx shrimps", Tabanidae: "Horsefly larvae",
  Aphelocheiridae: "River saucer bugs", Veliidae: "Water crickets", Sialidae: "Alderflies", Haliplidae: "Crawling water beetles",
  Gerridae: "Pond skaters", Corixidae: "Lesser water boatmen", Calopterygidae: "Demoiselles", Cordulegastridae: "Golden-ringed dragonflies",
  Coenagrionidae: "Blue damselflies", Bithyniidae: "Faucet snails", Siphlonuridae: "Summer mayflies", Astacidae: "Crayfish",
  Culicidae: "Mosquito larvae", Stratiomyidae: "Soldier fly larvae", Dryopidae: "Long-toed water beetles", Notonectidae: "Backswimmers",
  Nepidae: "Water scorpions", Hydrometridae: "Water measurers", Niphargidae: "Groundwater shrimps", Mysidae: "Opossum shrimps",
  Viviparidae: "River snails", Capniidae: "Small winter stoneflies", Ptychopteridae: "Phantom craneflies", Chaoboridae: "Phantom midges",
  Molannidae: "Hood-case caddis", Phryganeidae: "Large caddis", Rhagionidae: "Snipe fly larvae", Platycnemididae: "White-legged damselflies",
};

/** Common name: catalog first (unless it just repeats the family), then our list, then the Latin name. */
export function commonName(family: string, catalog?: Map<string, TaxonCatalogEntry> | null) {
  const c = catalog?.get(family)?.common_name;
  return c && c !== family ? c : COMMON_NAMES[family] ?? family;
}

/** Dex families first, then the rest, keeping the incoming order inside each group. */
export function dexFirst<T>(items: T[], family: (t: T) => string): T[] {
  return [...items.filter((t) => isDexFamily(family(t))), ...items.filter((t) => !isDexFamily(family(t)))];
}
