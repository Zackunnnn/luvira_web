// useContentStore.ts — Zustand state management store for dynamic website content & copywriting.
// Now acts as a client-side cache, syncing with Postgres via API routes.

import { create } from 'zustand';
import { SiteContent, HeroContent, AboutContent, FeaturesContent, MicrocopyContent } from '@/types/content';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';

interface ContentState {
  content: SiteContent;
  isLoading: boolean;

  fetchContent: () => Promise<void>;

  updateHeroContent: (payload: Partial<HeroContent>) => Promise<void>;
  updateAboutContent: (payload: Partial<AboutContent>) => Promise<void>;
  updateFeaturesContent: (payload: Partial<FeaturesContent>) => Promise<void>;
  updateMicrocopy: (payload: Partial<MicrocopyContent>) => Promise<void>;

  resetToDefaultContent: () => void;
}

export const useContentStore = create<ContentState>()((set, get) => ({
  content: DEFAULT_SITE_CONTENT,
  isLoading: false,

  fetchContent: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          set({ content: json.data });
        }
      }
    } catch (e) {
      console.error('Failed to fetch content', e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateHeroContent: async (payload) => {
    const newContent = {
      ...get().content,
      hero: { ...get().content.hero, ...payload },
    };
    set({ content: newContent });
    await fetch('/api/content', { method: 'PUT', body: JSON.stringify(newContent) });
  },

  updateAboutContent: async (payload) => {
    const newContent = {
      ...get().content,
      about: { 
        ...get().content.about, 
        ...payload,
        pillars: {
          ...get().content.about.pillars,
          ...(payload.pillars || {}),
        }
      },
    };
    set({ content: newContent });
    await fetch('/api/content', { method: 'PUT', body: JSON.stringify(newContent) });
  },

  updateFeaturesContent: async (payload) => {
    const newContent = {
      ...get().content,
      features: { 
        ...get().content.features, 
        ...payload,
        items: payload.items ? [...payload.items] : get().content.features.items,
      },
    };
    set({ content: newContent });
    await fetch('/api/content', { method: 'PUT', body: JSON.stringify(newContent) });
  },

  updateMicrocopy: async (payload) => {
    const newContent = {
      ...get().content,
      microcopy: { ...get().content.microcopy, ...payload },
    };
    set({ content: newContent });
    await fetch('/api/content', { method: 'PUT', body: JSON.stringify(newContent) });
  },

  resetToDefaultContent: () => {
    set({ content: JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT)) });
  },
}));
