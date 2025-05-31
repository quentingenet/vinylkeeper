import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiResponse } from "@models/BaseTypes";

interface StandardMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateQueries?: string[];
  successMessage?: string;
  showSuccessToast?: boolean;
}

export const useStandardMutation = <TData = any, TVariables = void>({
  mutationFn,
  invalidateQueries = [],
  successMessage,
  showSuccessToast = true,
  onSuccess,
  onError,
  ...options
}: StandardMutationOptions<TData, TVariables>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      if (showSuccessToast && successMessage) {
        console.log("Success:", successMessage);
      }

      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error("Mutation error:", error.message);
      onError?.(error, variables, context);
    },
    ...options,
  });
};
