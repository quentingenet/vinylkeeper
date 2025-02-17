export interface ICollectionForm {
  name: string;
  description: string;
  is_public: boolean;
}

export interface ICollection {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  registered_at: string;
}
