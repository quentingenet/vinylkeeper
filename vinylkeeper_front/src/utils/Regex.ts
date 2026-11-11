// A password being created or changed: 8 characters at least, symbols and spaces included.
// The login form accepts any password, so that older, shorter ones keep working.
export const passwordAtLeast8 = /^.{8,}$/s;

export const passwordWithNumber = /\d/;

// Any letter, accents included: the API accepts them too
export const passwordWithLetter = /\p{L}/u;

// Domain allows subdomains (one or more "label." groups) and TLDs of any
// length — the previous [a-zA-Z0-9-]+\.[a-zA-Z]{2,6} rejected valid emails
// like user@mail.example.io (subdomain) or user@example.technology (TLD > 6 chars).
export const emailValidator =
  /^[\w.!#$%&'*+/=?`{|}~^-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
