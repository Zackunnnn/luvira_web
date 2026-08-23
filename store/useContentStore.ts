// useContentStore.ts — Zustand state management store for dynamic website content & copywriting.
// Enables admin to customize all marketing copy (Hero, About, Tech Features, Microcopy) with 100% Zero-Cost localStorage persistence.
// Changes are instantly reflected across public storefront components.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  SiteContent,
  HeroContent,
  AboutContent,
  FeaturesContent,
  MicrocopyContent,
} from '@/types/content';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';

interface ContentState {
  content: SiteContent;

  // Granular update action methods
  updateHeroContent: (payload: Partial<HeroContent>) => void;
  updateAboutContent: (payload: Partial<AboutContent>) => void;
  updateFeaturesContent: (payload: Partial<FeaturesContent>) => void;
  updateMicrocopy: (payload: Partial<MicrocopyContent>) => void;

  // Emergency reset action to restore original copywriting
  resetToDefaultContent: () => void;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      content: DEFAULT_SITE_CONTENT,

      // updateHeroContent — Deep merges partial hero updates into existing hero state
      updateHeroContent: (payload) => {
        set((state) => ({
          content: {
            ...state.content,
            hero: {
              ...state.content.hero,
              ...payload,
            },
          },
        }));
      },

      // updateAboutContent — Merges partial about updates (including pillars)
      updateAboutContent: (payload) => {
        set((state) => ({
          content: {
            ...state.content,
            about: {
              ...state.content.about,
              ...payload,
              pillars: {
                ...state.content.about.pillars,
                ...(payload.pillars || {}),
              },
            },
          },
        }));
      },

      // updateFeaturesContent — Merges partial tech feature updates (including dynamic items array)
      updateFeaturesContent: (payload) => {
        set((state) => ({
          content: {
            ...state.content,
            features: {
              ...state.content.features,
              ...payload,
              items: payload.items ? [...payload.items] : state.content.features.items,
            },
          },
        }));
      },

      // updateMicrocopy — Merges partial microcopy updates
      updateMicrocopy: (payload) => {
        set((state) => ({
          content: {
            ...state.content,
            microcopy: {
              ...state.content.microcopy,
              ...payload,
            },
          },
        }));
      },

      // resetToDefaultContent — Resets all copywriting back to factory default
      resetToDefaultContent: () => {
        set({ content: JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT)) });
      },
    }),
    {
      name: 'luvira-site-content', // localStorage persistence key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ content: state.content }),
    }
  )
);
