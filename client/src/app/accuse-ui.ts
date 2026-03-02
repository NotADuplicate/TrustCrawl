export function canShowAccuseButton(
  restingActive: boolean,
  myHealth: number,
  accuseActive: boolean,
  playerName: string,
): boolean {
  return restingActive && myHealth >= 0 && !accuseActive && Boolean(playerName.trim());
}
