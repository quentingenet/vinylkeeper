import * as yup from "yup";
import { ICollectionForm } from "@models/ICollectionForm";

export const collectionValidationSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(1, "Name must be at least 1 character")
    .max(255, "Name cannot exceed 255 characters")
    .test("not-empty", "Name cannot be empty", (value: string | undefined) => {
      return value ? value.trim().length > 0 : false;
    }),
  description: yup
    .string()
    .max(255, "Description cannot exceed 255 characters")
    .optional(),
  is_public: yup.boolean().required("Visibility is required"),
  album_ids: yup
    .array()
    .of(yup.number().positive("Album ID must be positive"))
    .optional(),
  artist_ids: yup
    .array()
    .of(yup.number().positive("Artist ID must be positive"))
    .optional(),
}) as yup.ObjectSchema<ICollectionForm>;
