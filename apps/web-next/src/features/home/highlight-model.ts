export type HighlightCard = {
  creatorId: string
  displayName: string
  username: string
  avatarUrl?: string
  headline?: string
  isFollowed: boolean
  promotionActive: boolean
  deliveredImpressions: number
  targetImpressions: number
  liveNow: boolean
  monthlyPriceCoins?: number
}

export function sortHighlights(items: HighlightCard[]): HighlightCard[] {
  return [...items].sort((a, b) => {
    if (a.liveNow !== b.liveNow) return a.liveNow ? -1 : 1
    if (a.promotionActive !== b.promotionActive) return a.promotionActive ? -1 : 1
    if (a.isFollowed !== b.isFollowed) return a.isFollowed ? -1 : 1
    return b.deliveredImpressions - a.deliveredImpressions
  })
}
