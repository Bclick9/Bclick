export interface WinHouseNavigationMeasurement {
  readonly hidden?: boolean
  getAttribute(name: string): string | null
  getClientRects(): { readonly length: number }
  getBoundingClientRect(): { readonly height: number }
}

/**
 * Returns the real visible height of Bclick's fixed sports navigation for
 * WinHouse's documented data-bottom-gap attribute. The height includes
 * safe-area padding because it is measured from the rendered element.
 */
export function getWinHouseBottomGap(
  navigation: WinHouseNavigationMeasurement | null,
): number {
  if (
    !navigation
    || navigation.hidden
    || navigation.getAttribute('aria-hidden') === 'true'
    || navigation.getClientRects().length === 0
  ) {
    return 0
  }

  const height = navigation.getBoundingClientRect().height
  if (!Number.isFinite(height) || height <= 0) return 0
  return Math.ceil(height)
}
