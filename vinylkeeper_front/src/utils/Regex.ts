export const passwordAtLeast4 = /^.{4,}$/;

export const passwordWithNumber = /\d/;

export const passwordWithLetter = /[a-zA-Z]/;

// Domain allows subdomains (one or more "label." groups) and TLDs of any
// length — the previous [a-zA-Z0-9-]+\.[a-zA-Z]{2,6} rejected valid emails
// like user@mail.example.io (subdomain) or user@example.technology (TLD > 6 chars).
export const emailValidator =
  /^[\w.!#$%&'*+/=?`{|}~^-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
