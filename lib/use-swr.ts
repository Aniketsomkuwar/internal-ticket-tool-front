import { useState, useEffect } from 'react';

const cache = new Map<string, any>();

export function useSWR<Data = any, Error = any>(
  key: string | null,
  fetcher: (url: string) => Promise<Data>,
  config?: { fallbackData?: Data }
) {
  // Initialize with cached data, fallback data, or undefined
  const [data, setData] = useState<Data | undefined>(() => {
    if (key && cache.has(key)) return cache.get(key);
    return config?.fallbackData;
  });
  
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!key) return;

    let isMounted = true;

    const fetchData = async () => {
      setIsValidating(true);
      try {
        const newData = await fetcher(key);
        if (isMounted) {
          cache.set(key, newData);
          setData(newData);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [key, fetcher]);

  const mutate = (newData: Data) => {
    if (key) {
      cache.set(key, newData);
    }
    setData(newData);
  };

  return {
    data,
    error,
    isValidating,
    mutate,
  };
}
