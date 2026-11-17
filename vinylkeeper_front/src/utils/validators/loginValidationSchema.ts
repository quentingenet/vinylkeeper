import * as yup from "yup";
import i18n from "@utils/i18n";
import { emailValidator } from "@utils/Regex";

export const loginValidationSchema = yup.object({
  email: yup
    .string()
    .test("email", () => i18n.t("validation:email.invalid"), (value) => {
      if (value != undefined) {
        return emailValidator.test(value);
      }
      return false;
    })
    .min(3, () => i18n.t("validation:email.tooShort"))
    .required(() => i18n.t("validation:email.required")),
  password: yup.string().required(() => i18n.t("validation:password.required")),
});
