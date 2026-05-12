// Cienka warstwa eventowa do otwierania Command Palette z dowolnego miejsca w UI
// bez fałszowania zdarzeń klawiatury.
export const COMMAND_PALETTE_OPEN_EVENT = "cryptopuls:open-command-palette";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}
