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
export { placeApiService } from "./PlaceApiService";
export { adminApiService } from "./AdminApiService";

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

export type {
  Place,
  CreatePlaceData,
  GeocodingResult,
} from "./PlaceApiService";

export type {
  ModerationRequest,
  ModerationRequestList,
  ModerationStats,
  ModerationStatus,
} from "./AdminApiService";
