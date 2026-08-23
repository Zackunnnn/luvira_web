// types/content.ts — TypeScript interfaces for dynamic website copywriting and CMS content.
// Defines structured content for Hero, About, Feature Highlights, and Cart/Catalog microcopy.

export interface HeroContent {
  announcement: string; // Top promotional banner running text
  tagline: string; // Small brand tagline under logo
  badge: string; // Pill badge above hero headline
  headline: string; // Main H1 hero headline
  subheadline: string; // Subtitle description paragraph
  ctaText: string; // Primary call-to-action button label
  trustBadge1: string; // Left trust badge label
  trustBadge2: string; // Right trust badge label
}

export interface BrandPillar {
  title: string; // Pillar title (e.g., "Modest", "Comfortable", "Chic")
  subtitle: string; // Pillar subtitle badge/catchphrase
  description: string; // Pillar explanatory narrative
}

export interface AboutContent {
  badge: string; // Pill badge above section title
  title: string; // Main section heading
  description: string; // Section introductory description
  pillars: {
    modest: BrandPillar;
    comfortable: BrandPillar;
    chic: BrandPillar;
  };
}

export interface FeatureItem {
  id?: string; // Optional unique identifier
  title: string; // Dynamic feature title (e.g., "100% Premium Nylon", "Ergonomic Split Toe")
  subtitle: string; // Dynamic feature short badge / subtitle
  description: string; // Dynamic feature benefit explanation
}

export interface FeaturesContent {
  badge: string; // Section pill badge
  title: string; // Section main heading
  description: string; // Section introductory description
  items: FeatureItem[]; // Dynamic array of feature items (no hardcoded keys or limits)
}

export interface MicrocopyContent {
  cartPromo: string; // Promo text strip inside Cart Drawer
  cartEmptyTitle: string; // Title when cart has 0 items
  cartEmptySubtitle: string; // Subtitle encouraging browsing
  cartCta: string; // Button label to start shopping from empty cart
  catalogBadge: string; // Pill badge on product catalog grid
  catalogTitle: string; // Main heading for catalog section
  catalogSubtitle: string; // Subtitle description for catalog section
}

export interface SiteContent {
  hero: HeroContent;
  about: AboutContent;
  features: FeaturesContent;
  microcopy: MicrocopyContent;
}
