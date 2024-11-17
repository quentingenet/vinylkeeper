import * as yup from "yup";

export const collectionValidationSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2characters")
    .max(100, "Name must be less than 100 characters"),
  description: yup
    .string()
    .required("Description is required")
    .min(3, "Description must be at least 3 characters")
    .max(250, "Description must be less than 250 characters"),
  is_public: yup.boolean().required("Required"),
});
