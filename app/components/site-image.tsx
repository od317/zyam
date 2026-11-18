type Img = {
  thumbUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

export function SiteImage({
  image,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  image: Img | null;
  alt: string;
  sizes: string; // tells the browser how wide the image will be on screen
  priority?: boolean; // true only for the first image visible on the page
  className?: string;
}) {
  if (!image || !image.mediumUrl) {
    return <div className={`bg-ink-2 ${className}`} aria-hidden="true" />;
  }
  const srcSet = [
    image.thumbUrl && `${image.thumbUrl} 400w`,
    image.mediumUrl && `${image.mediumUrl} 800w`,
    image.largeUrl && `${image.largeUrl} 1600w`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.mediumUrl}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={
        image.blurDataUrl
          ? {
              backgroundImage: `url(${image.blurDataUrl})`,
              backgroundSize: "cover",
            }
          : undefined
      }
      className={`bg-ink-2 ${className}`}
    />
  );
}
