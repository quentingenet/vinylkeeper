export const passwordAtLeast4 = /^.{4,}$/;
export const passwordWithNumber = /^(?=.*\d).+$/;
export const passwordWithLetter = /^(?=.*[a-zA-Z]).+$/;
export const emailValidator =
    /^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]{2,40}@(?:[a-zA-Z0-9-]{2,40}\.)+[a-zA-Z]{2,6}$/;
