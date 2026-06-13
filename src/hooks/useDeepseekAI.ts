import { useState, useCallback } from 'react';

export function useDeepseekAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const call = useCallback(async ({ task, payload }: { task: string; payload: Record<string, string> }): Promise<string> => {
    setLoading(true);
    setError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/deepseek-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ task, ...payload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${res.status})`);
      }

      const data = await res.json();
      return data.content;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请求失败，请稍后重试';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, call };
}
