const formData = require('form-data')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const effects = [
  {
    "title": "sea",
    "url": "https://textpro.me/create-3d-deep-sea-metal-text-effect-online-1053.html"
  },
  {
    "title": "american-flag",
    "url": "https://textpro.me/create-american-flag-3d-text-effect-online-1051.html"
  },
  {
    "title": "scifi1",
    "url": "https://textpro.me/create-3d-sci-fi-text-effect-online-1050.html"
  },
  {
    "title": "scifi2",
    "url": "https://textpro.me/sci-fi-text-effect-855.html"
  },
  {
    "title": "rainbow-calligraphy",
    "url": "https://textpro.me/3d-rainbow-color-calligraphy-text-effect-1049.html"
  },
  {
    "title": "water-pipe",
    "url": "https://textpro.me/create-3d-water-pipe-text-effects-online-1048.html"
  },
  {
    "title": "Halloween-skeleton",
    "url": "https://textpro.me/create-halloween-skeleton-text-effect-online-1047.html"
  },
  {
    "title": "sketch",
    "url": "https://textpro.me/create-a-sketch-text-effect-online-1044.html"
  },
  {
    "title": "blue-circuit",
    "url": "https://textpro.me/create-blue-circuit-style-text-effect-online-1043.html"
  },
  {
    "title": "space",
    "url": "https://textpro.me/create-space-text-effects-online-free-1042.html"
  },
  {
    "title": "metallic",
    "url": "https://textpro.me/create-a-metallic-text-effect-free-online-1041.html"
  },
  {
    "title": "science-fiction",
    "url": "https://textpro.me/create-science-fiction-text-effect-online-free-1038.html"
  },
  {
    "title": "green-horror",
    "url": "https://textpro.me/create-green-horror-style-text-effect-online-1036.html"
  },
  {
    "title": "transformers",
    "url": "https://textpro.me/create-a-transformer-text-effect-online-1035.html"
  },
  {
    "title": "berry",
    "url": "https://textpro.me/create-berry-text-effect-online-free-1033.html"
  },
  {
    "title": "thunder",
    "url": "https://textpro.me/online-thunder-text-effect-generator-1031.html"
  },
  {
    "title": "magma",
    "url": "https://textpro.me/create-a-magma-hot-text-effect-online-1030.html"
  },
  {
    "title": "cracked-stone",
    "url": "https://textpro.me/3d-stone-cracked-cool-text-effect-1029.html"
  },
  {
    "title": "neon-light",
    "url": "https://textpro.me/create-3d-neon-light-text-effect-online-1028.html"
  },
  {
    "title": "glitch",
    "url": "https://textpro.me/create-impressive-glitch-text-effects-online-1027.html"
  },
  {
    "title": "cracked-surface",
    "url": "https://textpro.me/create-embossed-text-effect-on-cracked-surface-1024.html"
  },
  {
    "title": "broken-glass",
    "url": "https://textpro.me/broken-glass-text-effect-free-online-1023.html"
  },
  {
    "title": "art-paper",
    "url": "https://textpro.me/create-art-paper-cut-text-effect-online-1022.html"
  },
  {
    "title": "gradient",
    "url": "https://textpro.me/online-3d-gradient-text-effect-generator-1020.html"
  },
  {
    "title": "glossy-metal",
    "url": "https://textpro.me/create-a-3d-glossy-metal-text-effect-1019.html"
  },
  {
    "title": "watercolor",
    "url": "https://textpro.me/create-a-free-online-watercolor-text-effect-1017.html"
  },
  {
    "title": "multicolor-paper",
    "url": "https://textpro.me/online-multicolor-3d-paper-cut-text-effect-1016.html"
  },
  {
    "title": "devil-wings",
    "url": "https://textpro.me/create-neon-devil-wings-text-effect-online-free-1014.html"
  },
  {
    "title": "underwater",
    "url": "https://textpro.me/3d-underwater-text-effect-generator-online-1013.html"
  },
  {
    "title": "bear-logo",
    "url": "https://textpro.me/online-black-and-white-bear-mascot-logo-creation-1012.html"
  },
  {
    "title": "graffiti-art",
    "url": "https://textpro.me/create-wonderful-graffiti-art-text-effect-1011.html"
  },
  {
    "title": "christmas",
    "url": "https://textpro.me/create-a-christmas-holiday-snow-text-effect-1007.html"
  },
  {
    "title": "winter-snow",
    "url": "https://textpro.me/create-snow-text-effects-for-winter-holidays-1005.html"
  },
  {
    "title": "cloud1",
    "url": "https://textpro.me/create-a-cloud-text-effect-on-the-sky-online-1004.html"
  },
  {
    "title": "luxury-gold",
    "url": "https://textpro.me/3d-luxury-gold-text-effect-online-1003.html"
  },
  {
    "title": "blackpink",
    "url": "https://textpro.me/create-blackpink-logo-style-online-1001.html"
  },
  {
    "title": "cloud2",
    "url": "https://textpro.me/create-a-cloud-text-effect-in-the-sky-online-997.html"
  },
  {
    "title": "beach-sand",
    "url": "https://textpro.me/write-in-sand-summer-beach-free-online-991.html"
  },
  {
    "title": "sand-writing",
    "url": "https://textpro.me/sand-writing-text-effect-online-990.html"
  },
  {
    "title": "sand-engraved",
    "url": "https://textpro.me/sand-engraved-3d-text-effect-989.html"
  },
  {
    "title": "glue",
    "url": "https://textpro.me/create-3d-glue-text-effect-with-realistic-style-986.html"
  },
  {
    "title": "dark-gold",
    "url": "https://textpro.me/metal-dark-gold-text-effect-984.html"
  },
  {
    "title": "1917",
    "url": "https://textpro.me/1917-style-text-effect-online-980.html"
  },
  {
    "title": "holographic",
    "url": "https://textpro.me/holographic-3d-text-effect-975.html"
  },
  {
    "title": "purple-metal",
    "url": "https://textpro.me/metal-purple-dual-effect-973.html"
  },
  {
    "title": "deluxe-silver",
    "url": "https://textpro.me/deluxe-silver-text-effect-970.html"
  },
  {
    "title": "blue-metal",
    "url": "https://textpro.me/glossy-blue-metal-text-effect-967.html"
  },
  {
    "title": "deluxe-gold",
    "url": "https://textpro.me/deluxe-gold-text-effect-966.html"
  },
  {
    "title": "glossy-carbon",
    "url": "https://textpro.me/glossy-carbon-text-effect-965.html"
  },
  {
    "title": "fabric",
    "url": "https://textpro.me/fabric-text-effect-online-964.html"
  },
  {
    "title": "new-year",
    "url": "https://textpro.me/new-year-cards-3d-by-name-960.html"
  },
  {
    "title": "xmas",
    "url": "https://textpro.me/xmas-cards-3d-online-942.html"
  },
  {
    "title": "blood",
    "url": "https://textpro.me/blood-text-on-the-frosted-glass-941.html"
  },
  {
    "title": "halloween-fire",
    "url": "https://textpro.me/halloween-fire-text-effect-940.html"
  },
  {
    "title": "joker-logo",
    "url": "https://textpro.me/create-logo-joker-online-934.html"
  },
  {
    "title": "wicker",
    "url": "https://textpro.me/wicker-text-effect-online-932.html"
  },
  {
    "title": "leaves",
    "url": "https://textpro.me/natural-leaves-text-effect-931.html"
  },
  {
    "title": "firework",
    "url": "https://textpro.me/firework-sparkle-text-effect-930.html"
  },
  {
    "title": "skeleton",
    "url": "https://textpro.me/skeleton-text-effect-online-929.html"
  },
  {
    "title": "red-balloon",
    "url": "https://textpro.me/red-foil-balloon-text-effect-928.html"
  },
  {
    "title": "purple-balloon",
    "url": "https://textpro.me/purple-foil-balloon-text-effect-927.html"
  },
  {
    "title": "pink-balloon",
    "url": "https://textpro.me/pink-foil-balloon-text-effect-926.html"
  },
  {
    "title": "green-balloon",
    "url": "https://textpro.me/green-foil-balloon-text-effect-925.html"
  },
  {
    "title": "cyan-balloon",
    "url": "https://textpro.me/cyan-foil-balloon-text-effect-924.html"
  },
  {
    "title": "blue-balloon",
    "url": "https://textpro.me/blue-foil-balloon-text-effect-923.html"
  },
  {
    "title": "gold-balloon",
    "url": "https://textpro.me/gold-foil-balloon-text-effect-922.html"
  },
  {
    "title": "steel",
    "url": "https://textpro.me/steel-text-effect-online-921.html"
  },
  {
    "title": "ultra-gloss",
    "url": "https://textpro.me/ultra-gloss-text-effect-online-920.html"
  },
  {
    "title": "denim",
    "url": "https://textpro.me/denim-text-effect-online-919.html"
  },
  {
    "title": "decorate-green",
    "url": "https://textpro.me/decorate-green-text-effect-918.html"
  },
  {
    "title": "decorate-purple",
    "url": "https://textpro.me/decorate-purple-text-effect-917.html"
  },
  {
    "title": "peridot-stone",
    "url": "https://textpro.me/peridot-stone-text-effect-916.html"
  },
  {
    "title": "rock",
    "url": "https://textpro.me/rock-text-effect-online-915.html"
  },
  {
    "title": "lava",
    "url": "https://textpro.me/lava-text-effect-online-914.html"
  },
  {
    "title": "yellow-glass",
    "url": "https://textpro.me/yellow-glass-text-effect-913.html"
  },
  {
    "title": "purple-glass",
    "url": "https://textpro.me/purple-glass-text-effect-912.html"
  },
  {
    "title": "orange-glass",
    "url": "https://textpro.me/orange-glass-text-effect-911.html"
  },
  {
    "title": "green-glass",
    "url": "https://textpro.me/green-glass-text-effect-910.html"
  },
  {
    "title": "cyan-glass",
    "url": "https://textpro.me/cyan-glass-text-effect-909.html"
  },
  {
    "title": "blue-glass",
    "url": "https://textpro.me/blue-glass-text-effect-908.html"
  },
  {
    "title": "red-glass",
    "url": "https://textpro.me/red-glass-text-effect-907.html"
  },
  {
    "title": "purple-shiny-glass",
    "url": "https://textpro.me/purple-shiny-glass-text-effect-906.html"
  },
  {
    "title": "captain-america",
    "url": "https://textpro.me/captain-america-text-effect-905.html"
  },
  {
    "title": "r2-d2",
    "url": "https://textpro.me/robot-r2-d2-text-effect-903.html"
  },
  {
    "title": "rainbow-equalizer",
    "url": "https://textpro.me/rainbow-equalizer-text-effect-902.html"
  },
  {
    "title": "toxic",
    "url": "https://textpro.me/toxic-text-effect-online-901.html"
  },
  {
    "title": "pink-jewelry",
    "url": "https://textpro.me/pink-sparkling-jewelry-text-effect-899.html"
  },
  {
    "title": "blue-jewelry",
    "url": "https://textpro.me/blue-sparkling-jewelry-text-effect-898.html"
  },
  {
    "title": "green-jewelry",
    "url": "https://textpro.me/green-sparkling-jewelry-text-effect-897.html"
  },
  {
    "title": "purple-jewelry",
    "url": "https://textpro.me/purple-sparkling-jewelry-text-effect-896.html"
  },
  {
    "title": "gold-jewelry",
    "url": "https://textpro.me/gold-sparkling-jewelry-text-effect-895.html"
  },
  {
    "title": "red-jewelry",
    "url": "https://textpro.me/red-sparkling-jewelry-text-effect-894.html"
  },
  {
    "title": "cyan-jewelry",
    "url": "https://textpro.me/cyan-sparkling-jewelry-text-effect-893.html"
  },
  {
    "title": "purple-glass",
    "url": "https://textpro.me/purple-glass-text-effect-online-892.html"
  },
  {
    "title": "decorative-glass",
    "url": "https://textpro.me/decorative-glass-text-effect-891.html"
  },
  {
    "title": "chocolate-cake",
    "url": "https://textpro.me/chocolate-cake-text-effect-890.html"
  },
  {
    "title": "strawberry",
    "url": "https://textpro.me/strawberry-text-effect-online-889.html"
  },
  {
    "title": "koi-fish",
    "url": "https://textpro.me/koi-fish-text-effect-online-888.html"
  },
  {
    "title": "bread",
    "url": "https://textpro.me/bread-text-effect-online-887.html"
  },
  {
    "title": "matrix",
    "url": "https://textpro.me/matrix-style-text-effect-online-884.html"
  },
  {
    "title": "box",
    "url": "https://textpro.me/3d-box-text-effect-online-880.html"
  },
  {
    "title": "neon",
    "url": "https://textpro.me/neon-text-effect-online-879.html"
  },
  {
    "title": "road-warning",
    "url": "https://textpro.me/road-warning-text-effect-878.html"
  },
  {
    "title": "bokeh",
    "url": "https://textpro.me/bokeh-text-effect-876.html"
  },
  {
    "title": "advanced-glow",
    "url": "https://textpro.me/free-advanced-glow-text-effect-873.html"
  },
  {
    "title": "dropwater",
    "url": "https://textpro.me/dropwater-text-effect-872.html"
  },
  {
    "title": "break-wall",
    "url": "https://textpro.me/break-wall-text-effect-871.html"
  },
  {
    "title": "chrismast-gift",
    "url": "https://textpro.me/chrismast-gift-text-effect-869.html"
  },
  {
    "title": "honey",
    "url": "https://textpro.me/honey-text-effect-868.html"
  },
  {
    "title": "drug-bag",
    "url": "https://textpro.me/plastic-bag-drug-text-effect-867.html"
  },
  {
    "title": "horror-gift",
    "url": "https://textpro.me/horror-gift-text-effect-866.html"
  },
  {
    "title": "marble-slabs",
    "url": "https://textpro.me/marble-slabs-text-effect-864.html"
  },
  {
    "title": "marble",
    "url": "https://textpro.me/marble-text-effect-863.html"
  },
  {
    "title": "ice-cold",
    "url": "https://textpro.me/ice-cold-text-effect-862.html"
  },
  {
    "title": "fruit-juice",
    "url": "https://textpro.me/fruit-juice-text-effect-861.html"
  },
  {
    "title": "rusty-metal",
    "url": "https://textpro.me/rusty-metal-text-effect-860.html"
  },
  {
    "title": "abstra-gold",
    "url": "https://textpro.me/abstra-gold-text-effect-859.html"
  },
  {
    "title": "biscuit",
    "url": "https://textpro.me/biscuit-text-effect-858.html"
  },
  {
    "title": "bagel",
    "url": "https://textpro.me/bagel-text-effect-857.html"
  },
  {
    "title": "wood",
    "url": "https://textpro.me/wood-text-effect-856.html"
  },
  {
    "title": "metal-rainbow",
    "url": "https://textpro.me/metal-rainbow-text-effect-854.html"
  },
  {
    "title": "purple-gem",
    "url": "https://textpro.me/purple-gem-text-effect-853.html"
  },
  {
    "title": "shiny-metal",
    "url": "https://textpro.me/shiny-metal-text-effect-852.html"
  },
  {
    "title": "hot-metal",
    "url": "https://textpro.me/hot-metal-text-effect-843.html"
  },
  {
    "title": "hexa-golden",
    "url": "https://textpro.me/hexa-golden-text-effect-842.html"
  },
  {
    "title": "blue-glitter",
    "url": "https://textpro.me/blue-glitter-text-effect-841.html"
  },
  {
    "title": "purple-glitter",
    "url": "https://textpro.me/purple-glitter-text-effect-840.html"
  },
  {
    "title": "pink-glitter",
    "url": "https://textpro.me/pink-glitter-text-effect-839.html"
  },
  {
    "title": "green-glitter",
    "url": "https://textpro.me/green-glitter-text-effect-838.html"
  },
  {
    "title": "silver-glitter",
    "url": "https://textpro.me/silver-glitter-text-effect-837.html"
  },
  {
    "title": "gold-glitter",
    "url": "https://textpro.me/gold-glitter-text-effect-836.html"
  },
  {
    "title": "bronze-glitter",
    "url": "https://textpro.me/bronze-glitter-text-effect-835.html"
  },
  {
    "title": "eroded-metal",
    "url": "https://textpro.me/eroded-metal-text-effect-834.html"
  },
  {
    "title": "carbon",
    "url": "https://textpro.me/carbon-text-effect-833.html"
  },
  {
    "title": "pink-candy",
    "url": "https://textpro.me/pink-candy-text-effect-832.html"
  },
  {
    "title": "blue-metal",
    "url": "https://textpro.me/blue-metal-text-effect-831.html"
  },
  {
    "title": "black-metal",
    "url": "https://textpro.me/black-metal-text-effect-829.html"
  },
  {
    "title": "blue-gem",
    "url": "https://textpro.me/blue-gem-text-effect-830.html"
  },
  {
    "title": "glowing-metal",
    "url": "https://textpro.me/3d-glowing-metal-text-effect-828.html"
  },
  {
    "title": "chrome",
    "url": "https://textpro.me/3d-chrome-text-effect-827.html"
  }
]

exports.effects = () => { return effects }
exports.textpro = async (effect, ...texts) => {
  const eff = effects.find(v => (new RegExp(v.title, 'gi')).test(effect))
  if (!eff) return 404
  const resCookie = await fetch(eff.url, { headers: { "User-Agent": "GoogleBot" }})
  const html = await resCookie.text()
  const $$$ = cheerio.load(html)
  const textRequire = [!!$$$('#text-0').length, !!$$$('#text-1').length, !!$$$('#text-2').length].filter(v => v)
  if (textRequire.length > texts.length) return textRequire.length
  const cookieParse = (cookie, query) => cookie.includes(query + '=') ? cookie.split(query + '=')[1].split(';')[0] : 'undefined'
  let hasilcookie = resCookie.headers.get("set-cookie")
  hasilcookie = { __cfduid: cookieParse(hasilcookie, '__cfduid'), PHPSESSID: cookieParse(hasilcookie, 'PHPSESSID') }
  hasilcookie = Object.entries(hasilcookie).map(([name, value]) => name + '=' + value).join("; ")
  const form = new formData()
  for (const text of texts) form.append("text[]", text)
  form.append("submit", "Go")
  form.append("token", cheerio.load(html)('input[name="token"]').attr("value"))
  form.append("build_server", "https://textpro.me")
  form.append("build_server_id", 1)
  const resUrl = await fetch(eff.url, { method: "POST", headers: { Accept: "*/*", "Accept-Language": "en-US,en;q=0.9", "User-Agent": "GoogleBot", Cookie: hasilcookie, ...form.getHeaders() }, body: form.getBuffer() })
  const token2 = JSON.parse(cheerio.load(await resUrl.text())('#form_value').eq(1).text())
  const body = Object.keys(token2).map((key) => {
    let v = token2[key]
    const keys = encodeURIComponent(key + (Array.isArray(v) ? "[]" : ""))
    if (!Array.isArray(v)) v = [v]
    let out = []
    for (const i of v) out.push(keys + "=" + encodeURIComponent(i))
    return out.join("&")
  }).join("&")
  const resImgUrl = await fetch(`https://textpro.me/effect/create-image?${body}`, { headers: { Accept: "*/*", "Accept-Language": "en-US,en;q=0.9", "User-Agent": "GoogleBot", Cookie: hasilcookie }})
  return `https://textpro.me${(await resImgUrl.json()).fullsize_image}`
}