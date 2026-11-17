/** title and description: translation keys (a plain text shows as it is) */
export interface PreviewSlide {
  title: string;
  description: string;
  image: string;
}

export const previewSlides: PreviewSlide[] = [
  {
    title: "landing:preview.slides.dashboard.title",
    description: "landing:preview.slides.dashboard.description",
    image: "/vk_preview/preview_vk_1.webp",
  },
  {
    title: "landing:preview.slides.add.title",
    description: "landing:preview.slides.add.description",
    image: "/vk_preview/preview_vk_2.webp",
  },
  {
    title: "landing:preview.slides.collections.title",
    description: "landing:preview.slides.collections.description",
    image: "/vk_preview/preview_vk_3.webp",
  },
  {
    title: "landing:preview.slides.atlas.title",
    description: "landing:preview.slides.atlas.description",
    image: "/vk_preview/preview_vk_4.webp",
  },
];
