// Reserved ad inventory. The MVP ships no ad network (per the business brief);
// these placeholders hold real layout space so AdSense/Ezoic tags can drop in
// later without moving the design around. Keep every ad position going through
// this component so the swap happens in exactly one place.

type AdSize = 'leaderboard' | 'rectangle'

const DIMENSIONS: Record<AdSize, { maxWidth: number; height: number; label: string }> = {
  leaderboard: { maxWidth: 728, height: 90, label: '728 × 90' },
  rectangle: { maxWidth: 300, height: 250, label: '300 × 250' },
}

export default function AdSlot({ size, id }: { size: AdSize; id: string }) {
  const dim = DIMENSIONS[size]
  return (
    <div className="ad-slot-wrap" data-ad-id={id}>
      <div
        className="ad-slot"
        style={{ maxWidth: dim.maxWidth, height: dim.height }}
        role="complementary"
        aria-label="Advertisement placeholder"
      >
        <span className="ad-slot-tag">Ad</span>
        <span className="ad-slot-dims">{dim.label}</span>
      </div>
    </div>
  )
}
