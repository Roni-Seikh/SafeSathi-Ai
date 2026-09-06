import { useCallback } from 'react';
import { useAppDispatch } from './redux';
import { pushToast } from '@/store/toastSlice';

/** Fire-and-forget toast helper — components call notify.success('Saved')
 * instead of wiring up dispatch + action creators every time. */
export function useToast() {
  const dispatch = useAppDispatch();
  const success = useCallback((message: string) => dispatch(pushToast('success', message)), [dispatch]);
  const error = useCallback((message: string) => dispatch(pushToast('error', message)), [dispatch]);
  const info = useCallback((message: string) => dispatch(pushToast('info', message)), [dispatch]);
  return { success, error, info };
}
