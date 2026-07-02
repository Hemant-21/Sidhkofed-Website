/**
 * Shared options for the reusable CRUD mutation hooks. Centralizes the
 * toast/callback contract so create/update/lifecycle/delete behave consistently.
 */

export interface CrudMutationOptions<TData = unknown, TVars = unknown> {
  /** Show a success toast (default true). */
  toastOnSuccess?: boolean;
  /** Success toast message (a sensible default is used per action). */
  successMessage?: string;
  /**
   * Show an error toast (default depends on the hook: true for lifecycle/delete,
   * false for create/update so the <Form> wrapper owns 422 field mapping).
   */
  toastOnError?: boolean;
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: unknown, vars: TVars) => void;
}
