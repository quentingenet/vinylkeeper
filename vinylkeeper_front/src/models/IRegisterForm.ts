export interface IRegisterForm {
  username: string;
  email: string;
  password: string;
  passwordBis: string;
  isAcceptedTerms: boolean;
  timezone: string;
  role_id?: number;
}
