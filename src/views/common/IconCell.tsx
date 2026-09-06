/**
 * The 32px VizRep thumbnail used in the object tables.
 *
 * `vizRepIcon` returns an empty string for a VizRep that carries no usable inline
 * image, and rendering that as `<img src="">` makes the browser re-request the
 * current page (React 19 warns about it). So the image is dropped entirely and a
 * span of the same size stands in, which keeps the column — and the whole table
 * behind it — from reflowing around a row that happens to have no icon.
 */
export default function IconCell({ src, name }: { src: string; name: string | undefined }) {
  const size = { display: "inline-block", width: 32, height: 32 } as const;

  if (!src) return <span style={size} />;

  return (
    <img
      alt={`image of ${name}`}
      className="image-list"
      style={{ ...size, objectFit: "contain" }}
      src={src}
    />
  );
}
