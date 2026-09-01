// Simple geometric crest placeholder — intentionally not a generated
// image, just a shield outline with the event initial.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" fill="none" aria-hidden="true">
      <path
        d="M20 2 36 8v12c0 12-7 18.5-16 22C11 38.5 4 32 4 20V8L20 2Z"
        fill="#101a2b"
        stroke="#c2760a"
        strokeWidth="1.5"
      />
      <path d="M20 8 30 12v8c0 8.5-5 13-10 15.5C15 33.5 10 29 10 20v-8l10-4Z" fill="none" stroke="#faf9f6" strokeWidth="1" />
      <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="700" fill="#faf9f6" fontFamily="Georgia, serif">
        P
      </text>
    </svg>
  );
}
