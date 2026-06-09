export function colorForNoradId(noradId: string): string {
  let hash = 0;
  for (let i = 0; i < noradId.length; i++) {
    hash = noradId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 72%, 55%)`;
}
