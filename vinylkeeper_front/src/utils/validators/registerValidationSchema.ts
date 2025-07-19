import * as yup from "yup";
import {
  emailValidator,
  passwordAtLeast4,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";

export const registerValidationSchema = yup.object({
  username: yup
    .string()
    .min(3, "Username must contain at least 3 characters")
    .matches(
      /^[a-z0-9]+$/,
      "Only lowercase letters and numbers allowed (no spaces or special characters)"
    )
    .required("Enter your username"),
  email: yup
    .string()
    .test("email", "Email not valid", (value) =>
      value ? emailValidator.test(value) : false
    )
    .min(3, "Email must contain at least 4 characters.")
    .required("You must enter your Email."),
  isAcceptedTerms: yup
    .boolean()
    .required("You must accept terms to use Vinyl Keeper"),
  password: yup
    .string()
    .required("Enter your password.")
    .matches(passwordWithLetter, "Your password must contain a letter")
    .matches(passwordWithNumber, "Your password must contain a number")
    .matches(
      passwordAtLeast4,
      "Your password must contain at least 4 characters"
    ),
  passwordBis: yup
    .string()
    .required("Confirm your password.")
    .oneOf([yup.ref("password"), ""], "It must be the same as the password"),
  timezone: yup.string().required(),
});
