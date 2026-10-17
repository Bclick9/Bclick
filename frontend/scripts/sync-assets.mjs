import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * Mirror the homepage artwork into public/assets so the UI uses local files.
 * Downloads are best-effort: inaccessible third-party mirrors are left to the
 * image component's direct-URL fallback, and the development server still starts.
 */
if (process.env.SKIP_ASSET_SYNC === '1') {
  console.log('[assets] sync skipped by environment')
  process.exit(0)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const publicAssets = path.resolve(here, '../public/assets')

const assets = [
  // Header, promotions and official CampeonBet feature banners.
  ['home/campeonbet-logo.svg', 'https://campeonbet.io/assets/cms/2e5b6402-2fa4-4053-b7e2-b3466495cd16/18.svg'],
  ['home/welcome-casino-bonus.webp', 'https://campeonbet.io/assets/cms/d7306129-2d7b-4787-898a-f25e88b47dd5/welcome-casino-bonus.webp'],
  ['home/welcome-sports-bonus.jpg', 'https://campeonbet.io/assets/cms/1c0a040c-6beb-420f-9d39-5dddb0cccf3b/welcome-sports-bonus.jpg'],
  ['home/welcome-sports-freebet.jpg', 'https://campeonbet.io/assets/cms/a5456fe7-a90b-4b43-a127-a9506dec060c/welcome-sports-freebet.jpg'],
  ['home/welcome-crypto-bonus.jpg', 'https://campeonbet.io/assets/cms/faab2744-96c6-4257-962e-4b0e597fee40/welcome-crypto-bonus.jpg'],
  ['home/monday-reload-bonus.jpg', 'https://campeonbet.io/assets/cms/28f6909b-a11e-42b9-8448-b23fa8a9e782/monday-reload-bonus.jpg'],
  ['home/prediction-market.webp', 'https://campeonbet.io/assets/cms/f9fa51ea-7845-4f4a-8cc3-eb2f0fca0245/PredictionMarket.webp'],
  ['home/champions-league.webp', 'https://campeonbet.io/assets/cms/f9fa51ea-7845-4f4a-8cc3-eb2f0fca0245/champions-league.webp'],
  ['home/premier-league.webp', 'https://campeonbet.io/assets/cms/f9fa51ea-7845-4f4a-8cc3-eb2f0fca0245/premier-league.webp'],
  ['home/novomatic.webp', 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Novomatic.webp'],
  ['home/endorphina.webp', 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Endorphina.webp'],
  ['home/rubyplay.webp', 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/RubyPlay.webp'],
  ['home/halloween-background.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],

  // Trending games.
  ['games/zeus-vs-hades.webp', 'https://casino-spa-api.toto.nl/assets/d00d2de6-b8b1-444d-b270-03c730cf4b10?c=52640948b55cf0ada088d923315b321e417a6b8befc03b66465a5d0ba78c4657&h=800&s=b&w=800&x=0&y=0'],
  ['games/lucky-ladys-charm.webp', 'https://a.storyblok.com/f/272686/400x400/90f4482e99/lucky-ladys-charm-deluxe.webp/m/600x600'],
  ['games/wild-clusters.webp', 'https://cdn.prod.website-files.com/63b3249466615535f76d4b4e/67c71620fc52bc38b5d542a6_Wild_Clusters_1020x618.webp'],
  ['games/raptor-doublemax.jpg', 'https://media.leovegas.com/images/games/raptor-2/raptor-2-tile.jpg?tr=w-1536'],
  ['games/wealth-bells-40.webp', 'https://evoplay.games/wp-content/uploads/2026/07/580x580-2-270x270.webp'],
  ['games/le-bandit.jpg', 'https://media.leovegas.com/images/games/le-bandit/le-bandit-tile.jpg?tr=w-1920'],
  ['games/big-bass-trophy-catch.webp', 'https://www.slottomat.com/storage/slot-images/big-bass-trophy-catch-42122.webp'],
  ['games/silver-coins.jpg', 'https://bfgames.com/wp-content/uploads/2026/05/silver_coins_screens_web_1.jpg'],
  ['games/eggs-of-fortune.png', 'https://static-wazdan.com/vault/assets/107/6b426c9566e75ddf775ce129e168ca8934ffa8b3bdb4093b040ae5f3182496b2.png?save_as=EggsOfFortune_logo_vertical.png'],
  ['games/blazing-coins.jpg', 'https://shuffle.com/api/v1/images/og-image?gameID=3c4f6168-b2e0-4795-b333-f09f2a838a9b'],

  // Slot Games row.
  ['games/slot-olympus-rivals.webp', 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640'],
  ['games/slot-chicken-coin.webp', 'https://chicken-coin.eu/media/chicken-coin-content-69ce19ca5d59b072709746.webp'],
  ['games/slot-vikings-hollywood.jpg', 'https://assets.aboutslots.com/uploads/assets/Vikings_Go_To_Holly_Wood_Wild_Fight_Rushing_Wilds_Yggdrasil_Slot_Thumbnail_1042ec92e7.jpg'],
  ['games/slot-book-of-ra-magic.jpg', 'https://slotslaunch.nyc3.digitaloceanspaces.com/12736/book-of-ra-magic.jpg'],
  ['games/slot-moneyfest.jpg', 'https://cdnpp.net/admin/files/upload/origin/58bs9vwi-8aabjldrs-wcexdcckpj.jpg'],
  ['games/slot-silver-coins.jpg', 'https://bfgames.com/wp-content/uploads/2026/05/silver_coins_screens_web_1.jpg'],
  ['games/slot-bonbon-pop-1000.png', 'https://images.sigma.world/bombone.png'],
  ['games/slot-blazing-coins.jpg', 'https://shuffle.com/api/v1/images/og-image?gameID=3c4f6168-b2e0-4795-b333-f09f2a838a9b'],
  ['games/slot-sun-totem.webp', 'https://mediumrare.imgix.net/d392426cb16f39f298956bbb8e6580bfdd7ff8fcb2da2df96658d1f0d3d5d2c9?auto=format&fit=min&h=800&w=800'],
  ['games/slot-3-lucky-nuggets.jpg', 'https://www.popiplay.com/wp-content/uploads/2026/06/3Lucky_Nuggets_1920x1080.jpg'],

  // Top Picks row.
  ['games/top-better-barn.webp', 'https://www.thesunvegas.co.uk/library/2026/games/Q2/BetterBarnHouseBonanza_540x540.webp'],
  ['games/top-book-of-ra.jpg', 'https://slotslaunch.nyc3.digitaloceanspaces.com/12736/book-of-ra-magic.jpg'],
  ['games/top-3-peppers.jpg', 'https://assets.slotslaunch.com/111126/3-peppers-of-fire.jpg'],
  ['games/top-burning-chilli.webp', 'https://mediumrare.imgix.net/d74820446fac2adf5864d441266bc769b8a79711ebd3b359fef93d6cd92e3cb0?auto=format&dpr=2&format=auto&q=70'],
  ['games/top-raptor-doublemax.jpg', 'https://spike-images.s3.eu-central-1.amazonaws.com/raptor-double-max-slot-online-logo_972adb11fc.jpeg'],
  ['games/top-jokers-wild-chaos.webp', 'https://mascot.games/wp-content/uploads/2026/08/jokers-wild-chaos.webp'],
  ['games/top-volcano-golden-coins.jpg', 'https://static.tildacdn.net/tild3037-3636-4131-a132-343130393265/Volcano_Golden_Coins.jpg'],
  ['games/top-fishermans-luck.webp', 'https://www.x3000.ee/cdn-cgi/image/width%3D800%2Cquality%3D85%2Cblur%3D0%2Cformat%3Dwebp/https%3A/cdn.sanity.io/images/ol1w6ddr/paf-prod/b0e391fe0b5353204aeb55793dc98a0f0df89df8-900x900.jpg?q=100'],
  ['games/top-jealous-ex.jpg', 'https://assets.aboutslots.com/uploads/assets/the_jealous_ex_betsoft_casino_slot_banner_dc809f1271.jpg'],

  // Halloween Games.
  ['games/halloween-death-dominion.webp', 'https://pragmaticspins.com/images/slots/death-dominion.webp'],
  ['games/halloween-coins-of-halloween.jpg', 'https://assets.aboutslots.com/uploads/assets/coins_of_halloween_hold_and_win_betsoft_slot_banner_91f38cdb25.jpg'],
  ['games/halloween-wolf-power.webp', 'https://media.royalpanda.com/images/games/wolf-power-megaways/wolf-power-megaways-tile.jpg'],
  ['games/halloween-spooky-kabuki.webp', 'https://assets.aboutslots.com/uploads/assets/spooky_kabuki_yggdrasil_slot_thumbnail.jpg'],
  ['games/halloween-vamp-hunt.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],
  ['games/halloween-bonanza.webp', 'https://pictures.tribuna.com/image/5f4d89cc-6ff9-449a-9935-9022c64fe184?quality=85&width=1200'],
  ['games/halloween-haunted-coins.jpg', 'https://static-wazdan.com/vault/assets/220/dca0abdd4d775ec2e2478e7e288ad8d3841b0242fedd1faca11115ba46103dbd.jpg?save_as=HauntedCoinsx1000_icon_960x720.jpg'],
  ['games/halloween-jack.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],
  ['games/halloween-devils-feast.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],

  // New Games row.
  ['games/new-wicked-grin.webp', 'https://www.hacksawgaming.com/games/wicked-grin'],
  ['games/new-9-orbs-of-gold.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],
  ['games/new-divine-queen-power-of-sun.png', 'https://storage.googleapis.com/www.hellomillions.com/en-us/tiles-v2/DivineQueenPowerOfSun/source.png'],
  ['games/new-zeus-flip.webp', 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640'],
  ['games/new-spooky-wild-40.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],
  ['games/new-candys-extra-scatter.webp', 'https://images.sigma.world/bombone.png'],
  ['games/new-crimson-heart.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],
  ['games/new-mighty-wild-gorilla.jpg', 'https://categories.ivycasino.com/uploads/images/1767949180_mighty-wild-gorilla.jpg'],
  ['games/new-icarus-heat-of-fortune.webp', 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640'],
  ['games/new-cat-n-rat.webp', 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp'],

  // VIP Specials row.
  ['games/vip-starlight-princess-1000.jpg', 'https://media.leovegas.com/lv/games/9KDqwYmpZ/Xj4pAflv75vKGe.jpg'],
  ['games/vip-lord-of-the-ocean.webp', 'https://media.leovegas.com/lv/games/9KDqwYmpZ/Xj4pAflv75vKGe.jpg'],
  ['games/vip-gates-of-olympus-1000.webp', 'https://media.leovegas.de/lv/games/aemb9PnNr/kg1noTVMjlq5Jw.jpg'],
  ['games/vip-lady-wolf-moon.webp', 'https://bgaming.com/wp-content/uploads/2025/06/64fc11aa2a90afe306718e1e_63ef3a53bd155d7136b3dd83_LadyWolfMoonlogo_vertical.webp'],
  ['games/vip-the-vip.webp', 'https://assets.aboutslots.com/uploads/assets/the_jealous_ex_betsoft_casino_slot_banner_dc809f1271.jpg'],
  ['games/vip-dragon-pots.webp', 'https://cdn1.svenskaspel.net/content/cms/images/640/auto/e3f2bc3a-2d64-49ab-ae4c-347cc4bac2f4/c_7017606366903/a97e7aa0-14ba-42da-b205-c8ce99de6c09/1.0/3-Dragon-Pots-Logo.jpg'],
  ['games/vip-voltage-blitz.webp', 'https://content.hollywoodbets.net/voltage_blitz_rapid_b8bf2fd3df.webp'],
  ['games/vip-le-hooligan.webp', 'https://media.leovegas.com/images/games/le-bandit/le-bandit-tile.jpg?tr=w-1920'],
  ['games/vip-coins-of-dragon.webp', 'https://cdn1.svenskaspel.net/content/cms/images/640/auto/e3f2bc3a-2d64-49ab-ae4c-347cc4bac2f4/c_7017606366903/a97e7aa0-14ba-42da-b205-c8ce99de6c09/1.0/3-Dragon-Pots-Logo.jpg'],
]

const imageSignatureMatches = (buffer, target, contentType = '') => {
  const extension = path.extname(target).toLowerCase()
  if (extension === '.svg') {
    const text = buffer.subarray(0, 1000).toString('utf8')
    return text.includes('<svg') || text.includes('<?xml')
  }
  if (extension === '.webp') return buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  if (extension === '.png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (extension === '.jpg' || extension === '.jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8
  return contentType.startsWith('image/') && buffer.length > 512
}

async function downloadAsset([relativePath, url]) {
  const destination = path.join(publicAssets, relativePath)
  try {
    const current = await stat(destination)
    if (current.size > 256) return { ok: true, skipped: true }
  } catch {
    // First run: file not created yet.
  }

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 CampeonBet-UI-Asset-Sync/1.0',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return { ok: false, path: relativePath, reason: `HTTP ${response.status}` }
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    const data = Buffer.from(await response.arrayBuffer())
    if (data.length < 512 || !imageSignatureMatches(data, relativePath, type)) {
      return { ok: false, path: relativePath, reason: `unexpected image type ${type || '(none)'}` }
    }

    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, data)
    return { ok: true, path: relativePath, bytes: data.length }
  } catch (error) {
    return { ok: false, path: relativePath, reason: error instanceof Error ? error.message : String(error) }
  }
}

const uniqueAssets = [...new Map(assets.map((asset) => [asset[0], asset])).values()]
let downloaded = 0
let skipped = 0
const failures = []

// Keep parallel requests limited so third-party image hosts don't throttle startup.
for (let i = 0; i < uniqueAssets.length; i += 6) {
  const results = await Promise.all(uniqueAssets.slice(i, i + 6).map(downloadAsset))
  for (const result of results) {
    if (result.ok && !result.skipped) downloaded += 1
    else if (result.ok) skipped += 1
    else failures.push(result)
  }
}

console.log(`[assets] ${downloaded} downloaded, ${skipped} already cached, ${failures.length} skipped`)
for (const failure of failures.slice(0, 8)) {
  console.warn(`[assets] ${failure.path}: ${failure.reason}`)
}
