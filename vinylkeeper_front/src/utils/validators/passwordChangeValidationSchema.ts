import * as yup from "yup";
import {
  passwordAtLeast8,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";

export const passwordChangeValidationSchema = yup.object({
  currentPassword: yup.string().required("Enter your current password."),
  newPassword: yup
    .string()
    .required("Enter your new password.")
    .matches(passwordWithLetter, "Your password must contain a letter")
    .matches(passwordWithNumber, "Your password must contain a number")
    .matches(
      passwordAtLeast8,
      "Your password must contain at least 8 characters"
    ),
  confirmPassword: yup
    .string()
    .required("Confirm your new password.")
    .oneOf(
      [yup.ref("newPassword"), ""],
      "It must be the same as the new password"
    ),
});
