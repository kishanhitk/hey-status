export const metaGenerator = ({
  title,
  description,
  ogImage = "https://hey-status.pages.dev/images/og-image.png",
}: {
  title?: string;
  description?: string;
  ogImage?: string;
}) => {
  const finalTitle = title
    ? `${title} | Hey Status – Monitor your website status`
    : "Hey Status – Monitor your website status";
  const descriptionContent =
    description ||
    "Keep your customers updated with the status of your website.";

  return [
    { title: finalTitle },
    { name: "description", content: descriptionContent },
    { property: "og:title", content: finalTitle },
    { property: "og:description", content: descriptionContent },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: finalTitle },
    { name: "twitter:description", content: descriptionContent },
    { name: "twitter:image", content: ogImage },
  ];
};
