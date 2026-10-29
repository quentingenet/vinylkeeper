export interface PreviewSlide {
  title: string;
  description: string;
  image: string;
}

export const previewSlides: PreviewSlide[] = [
  {
    title: "Dashboard",
    description:
      "Your collection at a glance: albums, artists and collections stats, your latest additions and what the community has added recently.",
    image: "/vk_preview/preview_vk_1.webp",
  },
  {
    title: "Add vinyls",
    description:
      "Search the Discogs catalogue by album or artist and add the records you own to your collections in a few clicks.",
    image: "/vk_preview/preview_vk_2.webp",
  },
  {
    title: "Collections",
    description:
      "Browse, search and sort your records, keep a wishlist, and make a collection public to share it with the community.",
    image: "/vk_preview/preview_vk_3.webp",
  },
  {
    title: "Vinyl Atlas",
    description:
      "Discover record shops, flea markets and vinyl spots on the community map of the Vinyl Atlas, and suggest your own favourite spots.",
    image: "/vk_preview/preview_vk_4.webp",
  },
];
