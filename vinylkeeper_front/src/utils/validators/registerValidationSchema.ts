import * as yup from "yup";
import i18n from "@utils/i18n";
import {
  emailValidator,
  passwordAtLeast8,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";

export const registerValidationSchema = yup.object({
  username: yup
    .string()
    .min(2, () => i18n.t("validation:username.tooShort"))
    .matches(
      /^[a-z0-9._-]+$/,
      () => i18n.t("validation:username.format")
    )
    .matches(
      /^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/,
      () => i18n.t("validation:username.edges")
    )
    .required(() => i18n.t("validation:username.required")),
  email: yup
    .string()
    .test("email", () => i18n.t("validation:email.invalid"), (value) =>
      value ? emailValidator.test(value) : false
    )
    .min(3, () => i18n.t("validation:email.tooShortRegister"))
    .required(() => i18n.t("validation:email.required")),
  isAcceptedTerms: yup
    .boolean()
    // .required() alone only rejects null/undefined — false is a "present"
    // boolean value and would pass, so the checkbox wouldn't actually be enforced.
    .oneOf([true], () => i18n.t("validation:terms.required"))
    .required(() => i18n.t("validation:terms.required")),
  password: yup
    .string()
    .required(() => i18n.t("validation:password.enter"))
    .matches(passwordWithLetter, () => i18n.t("validation:password.letter"))
    .matches(passwordWithNumber, () => i18n.t("validation:password.number"))
    .matches(
      passwordAtLeast8,
      () => i18n.t("validation:password.length")
    ),
  passwordBis: yup
    .string()
    .required(() => i18n.t("validation:password.confirmRequired"))
    .oneOf([yup.ref("password"), ""], () => i18n.t("validation:password.mismatch")),
  timezone: yup.string().required(),
});
