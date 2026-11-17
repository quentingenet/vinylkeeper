import * as yup from "yup";
import i18n from "@utils/i18n";
import { ICollectionForm } from "@models/ICollectionForm";

export const collectionValidationSchema = yup.object({
  name: yup
    .string()
    .required(() => i18n.t("validation:collection.nameRequired"))
    .min(1, () => i18n.t("validation:collection.nameMin"))
    .max(255, () => i18n.t("validation:collection.nameMax"))
    .test("not-empty", () => i18n.t("validation:collection.nameEmpty"), (value: string | undefined) => {
      return value ? value.trim().length > 0 : false;
    }),
  description: yup
    .string()
    .max(255, () => i18n.t("validation:collection.descriptionMax"))
    .optional(),
  is_public: yup.boolean().required(() => i18n.t("validation:collection.visibilityRequired")),
  album_ids: yup
    .array()
    .of(yup.number().positive(() => i18n.t("validation:collection.albumIdPositive")))
    .optional(),
  artist_ids: yup
    .array()
    .of(yup.number().positive(() => i18n.t("validation:collection.artistIdPositive")))
    .optional(),
}) as yup.ObjectSchema<ICollectionForm>;
