export interface IResetPassword {
  password: string;
  passwordBis: string;
}

export interface IResetPasswordToBackend {
  token: string;
  new_password: string;
}
