import * as yup from "yup";
import { emailValidator } from "@utils/Regex";

export const loginValidationSchema = yup.object({
  email: yup
    .string()
    .test("email", "Email not valid", (value) => {
      if (value != undefined) {
        return emailValidator.test(value);
      }
      return false;
    })
    .min(3, "Email must contain at least 4 characters.")
    .required("You must enter your Email."),
  password: yup.string().required("You must enter your password."),
});
