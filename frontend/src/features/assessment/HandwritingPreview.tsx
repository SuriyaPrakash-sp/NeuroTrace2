import { resolveAssetUrl } from "../../lib/api";

export function HandwritingPreview({ sampleUrl }: { sampleUrl: string }) {
  const img = resolveAssetUrl(sampleUrl);
  if (!img) return null;
  return (
    <img
      src={img}
      alt="Uploaded handwriting sample"
      className="h-28 w-40 rounded-xl border border-warm-200 object-cover"
    />
  );
}

export default HandwritingPreview;
