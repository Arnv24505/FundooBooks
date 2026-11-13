import Image from "next/image";

export default function BookCover({
  src,
  title,
  className = "book-cover",
  priority = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 265px",
}: {
  src?: string | null;
  title: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!src) {
    return (
      <div className={`cover-fallback ${className}`} aria-hidden>
        {title}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={`Cover of ${title}`}
      width={224}
      height={324}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}
