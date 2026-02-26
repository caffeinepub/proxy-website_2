import { useMutation } from '@tanstack/react-query';
import { useActor } from './useActor';

export function useProxyRequest() {
    const { actor } = useActor();

    return useMutation<string, Error, string>({
        mutationFn: async (url: string) => {
            if (!actor) throw new Error('Backend not ready. Please try again.');
            const result = await actor.processRequest(url);
            return result;
        },
    });
}
