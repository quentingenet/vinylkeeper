// New API Services - BaseApiService Architecture
export {
  CollectionApiService,
  collectionApiService,
} from "./CollectionApiService";
export {
  DashboardApiService,
  dashboardApiService,
} from "./DashboardApiService";
export {
  ExternalReferenceService,
  externalReferenceApiService,
} from "./ExternalReferenceService";
export {
  useAlbumMetadata,
  useArtistMetadata,
  fetchAlbumMetadata,
  fetchArtistMetadata,
} from "./MusicMetadataService";
export { SearchApiService, searchApiService } from "./SearchApiService";
export { UserApiService, userApiService } from "./UserApiService";
export { musicStreamingService } from "./MusicStreamingService";

// Base Service
export { BaseApiService } from "./BaseApiService";

// Type Exports
export type {
  UserMini,
  UserResponse,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "./UserApiService";

export type {
  CollectionCreate,
  CollectionUpdate,
  AlbumInCollection,
} from "./CollectionApiService";
