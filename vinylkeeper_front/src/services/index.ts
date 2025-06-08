// New API Services - BaseApiService Architecture
export { UserApiService, userApiService } from "./UserApiService";
export {
  CollectionApiService,
  collectionApiService,
} from "./CollectionApiService";
export { SearchApiService, searchApiService } from "./SearchApiService";

// Existing Services (migrated to BaseApiService)
export { WishlistApiService, wishlistApiService } from "./WishlistService";
export {
  ExternalReferenceService,
  externalReferenceApiService,
} from "./ExternalReferenceService";

// Base Service
export { BaseApiService } from "./BaseApiService";

// Type Exports
export type {
  ICurrentUser,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "./UserApiService";

export type { CollectionDetails } from "./CollectionApiService";

export type { SearchQuery, SearchResults } from "./SearchApiService";
