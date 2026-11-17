import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useUserContext } from "@contexts/UserContext";
import { userApiService } from "@services/UserApiService";
import { queryKeys } from "@utils/queryKeys";
import { applyLanguagePreference, toAppLanguage, type LanguagePreference } from "@utils/i18n";

/**
 * The language of the interface and the way to change it. The new language shows at once; a member's
 * choice is then saved on their account (back to the saved one if that fails). A visitor's choice
 * lasts until the page is reloaded: nothing is stored in the browser.
 */
export function useLanguagePreference() {
  const { i18n } = useTranslation();
  const { currentUser, setCurrentUser, isUserLoggedIn } = useUserContext();
  const queryClient = useQueryClient();
  const saved: LanguagePreference = currentUser?.language ?? null;

  const mutation = useMutation({
    mutationFn: (next: LanguagePreference) => userApiService.setLanguage(next),
    onMutate: (next) => {
      void applyLanguagePreference(next);
    },
    onSuccess: (_data, next) => {
      if (currentUser) setCurrentUser({ ...currentUser, language: next });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userSettings.all() });
    },
    onError: () => {
      void applyLanguagePreference(saved);
    },
  });

  const choose = (next: LanguagePreference) => {
    if (!isUserLoggedIn || !currentUser) {
      void applyLanguagePreference(next);
      return;
    }
    if (next !== saved) mutation.mutate(next);
  };

  return {
    /** What the member saved (null: automatic), or what is being saved */
    preference: mutation.isPending ? (mutation.variables ?? null) : saved,
    /** The language shown */
    language: toAppLanguage(i18n.resolvedLanguage ?? i18n.language),
    choose,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
