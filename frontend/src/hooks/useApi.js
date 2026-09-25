// Loads data for a page: const { data, error, reload, setData } = useApi('/projects').
// setData lets a page update the list itself (e.g. optimistic Kanban moves) without refetching.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setData(await api(path));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload, setData };
}
