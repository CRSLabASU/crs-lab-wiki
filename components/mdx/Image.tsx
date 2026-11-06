import type React from "react";
import NextImage from "next/image";

const sizeClasses = {
  small: "max-w-xs",
  medium: "max-w-md",
  large: "max-w-2xl",
  "extra-large": "max-w-full",
};

export function Image({
  src,
  alt = "",
  size = "extra-large",
}: {
  src: string;
  alt?: string;
  size?: "small" | "medium" | "large" | "extra-large";
}) {
  return (
    <figure className={`my-4 not-prose mx-auto ${sizeClasses[size]}`}>
      <div className="rounded-lg overflow-hidden border bg-muted">
        <NextImage
          src={src}
          alt={alt}
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>
      {alt && (
        <figcaption className="mt-2 text-sm text-center text-muted-foreground">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

export function ImageGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-4 not-prose justify-items-center">
      {children}
    </div>
  );
}
