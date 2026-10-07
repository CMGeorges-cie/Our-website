import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errMsg } from '../constants';

export const useLoad = (fn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError(e);
      if (e?.response?.status !== 401) toast.error(errMsg(e, 'Chargement impossible'));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
};

export const useAction = () => {
  const [busy, setBusy] = useState(null);
  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      const r = await fn();
      if (success) toast.success(success);
      return r;
    } catch (e) {
      toast.error(errMsg(e));
      return null;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
};
