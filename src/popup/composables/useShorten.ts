import { ref, type Ref } from 'vue';
import { useStorage } from './useStorage';
import { createShortLink, getAISlug } from '@/utils/api';
import type { ShortenResponse, RecentLink } from '@/utils/types';

const SHORT_DOMAIN = 'en.ke';

function extractErrorMessage(e: unknown): string {
  // Axios error with response body
  if (e && typeof e === 'object' && 'response' in e) {
    const r = (e as { response?: { data?: unknown; status?: number } }).response;
    if (r?.data) {
      if (typeof r.data === 'string') return r.data;
      if (typeof r.data === 'object') {
        const d = r.data as Record<string, unknown>;
        if (typeof d.message === 'string') return d.message;
        if (typeof d.error === 'string') return d.error;
      }
    }
    if (r?.status) return `Server error (${r.status})`;
  }
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

export function useShorten() {
  const storage = useStorage();

  const shortening: Ref<boolean> = ref(false);
  const result: Ref<ShortenResponse | null> = ref(null);
  const error: Ref<string> = ref('');

  const aiLoading: Ref<boolean> = ref(false);

  async function shorten(url: string, slug?: string, expDays?: number): Promise<boolean> {
    shortening.value = true;
    error.value = '';
    result.value = null;

    try {
      const res = await createShortLink(url, slug, expDays);
      const data = res.data;
      const link = data?.link;
      if (!link?.slug) {
        error.value = 'Failed to create short link';
        console.error('Unexpected API response:', data);
        return false;
      }
      result.value = data;

      // Save to recent links
      const recent: RecentLink = {
        slug: link.slug,
        shortUrl: `https://${SHORT_DOMAIN}/${link.slug}`,
        originalUrl: url,
        createdAt: Date.now(),
      };
      storage.addRecentLink(recent);

      return true;
    } catch (e) {
      error.value = extractErrorMessage(e);
      console.error('Shorten error:', e);
      return false;
    } finally {
      shortening.value = false;
    }
  }

  async function suggestSlug(url: string): Promise<string> {
    aiLoading.value = true;
    try {
      const res = await getAISlug(url);
      const slug = res.data.result?.slug ?? '';
      if (!slug || slug.includes(' ')) {
        throw new Error('AI suggestion failed');
      }
      return slug;
    } catch {
      return '';
    } finally {
      aiLoading.value = false;
    }
  }

  function reset(): void {
    result.value = null;
    error.value = '';
  }

  return {
    shortening,
    result,
    error,
    aiLoading,
    shorten,
    suggestSlug,
    reset,
  };
}
