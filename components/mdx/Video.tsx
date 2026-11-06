export function Video({
  youtubeId,
  src,
}: {
  youtubeId?: string;
  src?: string;
}) {
  if (src) {
    return (
      <div className="my-4 rounded-lg overflow-hidden border bg-muted">
        <video src={src} controls muted className="w-full" />
      </div>
    );
  }
  if (youtubeId) {
    return (
      <div style={{ position: "relative", paddingTop: "56.25%" }}>
        <iframe
          name="youtube-iframe"
          src={`https://www.youtube.com/embed/${youtubeId}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          allowFullScreen
        />
      </div>
    );
  }
  return null;
}
