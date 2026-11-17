import * as yup from "yup";
import i18n from "@utils/i18n";
import {
  passwordAtLeast8,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";

export const passwordChangeValidationSchema = yup.object({
  currentPassword: yup.string().required(() => i18n.t("validation:password.currentRequired")),
  newPassword: yup
    .string()
    .required(() => i18n.t("validation:password.newRequired"))
    .matches(passwordWithLetter, () => i18n.t("validation:password.letter"))
    .matches(passwordWithNumber, () => i18n.t("validation:password.number"))
    .matches(
      passwordAtLeast8,
      () => i18n.t("validation:password.length")
    ),
  confirmPassword: yup
    .string()
    .required(() => i18n.t("validation:password.confirmNewRequired"))
    .oneOf(
      [yup.ref("newPassword"), ""],
      () => i18n.t("validation:password.mismatchNew")
    ),
});
