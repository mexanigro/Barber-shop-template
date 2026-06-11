# SEO Guide — Arzac Studio

Referencia para que **cada web nueva salga optimizada de entrada**. Complementa `WEB-CREATION-PLAYBOOK.md`: el SEO no es una fase aparte, se configura al crear el deploy y se verifica antes de presentar al cliente.

---

## 1. Cómo funciona el SEO del template (3 capas)

| Capa | Archivo | Cuándo corre | Qué hace |
|---|---|---|---|
| **Build-time** | `scripts/vite-plugin-seo.ts` | `vite build` (cada deploy Vercel) | Reescribe `<title>`, meta description, OG/Twitter, canonical, `og:locale`, `og:site_name`, `og:image:alt`, `theme-color`, favicon y `<html lang>` en `index.html` según env vars. Appendea `Sitemap: {url}/sitemap.xml` a `robots.txt`. **Esto es lo que ven WhatsApp/Facebook/Google sin ejecutar JS.** |
| **Runtime** | `src/hooks/useSEO.ts` + `src/hooks/useSchema.ts` | Al montar la app, después de `bootstrapTenantConfig()` | Sobrescribe los mismos tags con datos frescos de Firestore (`config/{clientId}.brand`) e inyecta JSON-LD: LocalBusiness por nicho (+ servicios, horarios, redes) y FAQPage. |
| **Server** | `api/index.ts` (Vercel) / `server.ts` (local) | Por request | Sirve `/sitemap.xml` dinámico: home, /gallery, páginas legales y páginas de staff (`/equipo/{slug}` leídos de Firestore). |

**Orden de precedencia de los textos:** env vars Vercel (`VITE_BRAND_*`) > Firestore `config/{clientId}.brand` > preset del nicho (`src/lib/seo-defaults.ts`).

⚠️ El build-time layer es el que importa para crawlers y link previews. Si solo cargás la marca en Firestore y no seteás las env vars, **el preview de WhatsApp muestra el preset genérico del nicho** ("Ink Studio", "Master Barber"...). Siempre setear las env vars.

---

## 2. Checklist SEO por web nueva

### Al crear el proyecto Vercel (env vars)

- [ ] `VITE_ACTIVE_NICHE` — nicho correcto (drives schema type + defaults)
- [ ] `VITE_UI_LANGUAGE` — idioma del deploy (`en|he|ru|ar`) → `<html lang>`, `og:locale`, hreflang, RTL
- [ ] `VITE_APP_URL` — **canonical origin** (`https://{negocio}.arzac.studio`). Sin esto: canonical apunta al dominio `.vercel.app` y robots.txt queda sin línea Sitemap
- [ ] `VITE_BRAND_NAME` — nombre real del negocio
- [ ] `VITE_BRAND_TAGLINE` — tagline corto (forma el `<title>`: `Brand — Tagline`)
- [ ] `VITE_BRAND_DESCRIPTION` — meta description, 140–160 caracteres, en el idioma del deploy, con ciudad/zona si aplica ("ברעננה", "en Tel Aviv")
- [ ] `VITE_OG_IMAGE` — imagen 1200×630 del negocio (Firebase Storage o URL absoluta). **HEAD-check antes** (los IDs de Unsplash mueren)
- [ ] `VITE_FAVICON_EMOJI` + `VITE_THEME_ACCENT` — favicon y theme-color
- [ ] `APP_URL` — mismo valor que `VITE_APP_URL` (lo usa el sitemap serverless)

### En Firestore `config/{clientId}`

- [ ] `brand.name`, `brand.tagline`, `brand.description` — espejo de las env vars (el runtime los re-aplica y alimentan el JSON-LD y el chatbot)
- [ ] `brand.ogImage` — misma imagen que `VITE_OG_IMAGE`
- [ ] `contact.address` completo — sin dirección el LocalBusiness schema sale vacío
- [ ] `contact.phone` / `contact.email` — van al schema (`telephone`, `email`)
- [ ] `contact.social.instagram` (+ facebook) como **URL completa** (`https://instagram.com/...`) — alimenta `sameAs`
- [ ] `hours` reales — generan `openingHoursSpecification` (recordar gotcha: `saturday: null` = cerrado)
- [ ] Servicios con precio real — generan el `OfferCatalog`
- [ ] FAQ con preguntas reales del negocio — genera schema `FAQPage` (rich results)

### Dominio

- [ ] Subdominio `{negocio}.arzac.studio` asignado en Vercel **antes** del build final (canonical y sitemap lo usan)
- [ ] Si se agrega el dominio después: **redeploy obligatorio** (el canonical quedó horneado en el HTML)

### Verificación post-deploy (5 min, no negociable)

```bash
# 1. Canonical + title + description correctos en el HTML estático
curl -s https://{negocio}.arzac.studio/ | grep -E 'canonical|og:title|description'

# 2. Sitemap responde 200 con XML
curl -s https://{negocio}.arzac.studio/sitemap.xml

# 3. robots.txt tiene la línea Sitemap
curl -s https://{negocio}.arzac.studio/robots.txt
```

- [ ] [Rich Results Test](https://search.google.com/test/rich-results) — LocalBusiness + FAQPage sin errores
- [ ] Preview de WhatsApp/Telegram con la URL real — imagen + título del negocio (no el preset)
- [ ] PageSpeed Insights móvil ≥ 85 performance (ver §5)

---

## 3. Structured data por nicho

`src/hooks/useSchema.ts` emite el subtipo correcto automáticamente según `business.type`:

| Nicho | @type |
|---|---|
| barberia | `BarberShop` |
| nails | `NailSalon` |
| tattoo | `TattooParlor` |
| estetica | `BeautySalon` |
| cafeteria | `CafeOrCoffeeShop` |
| remodelaciones | `HomeAndConstructionBusiness` |
| employment | `EmploymentAgency` |

Qué incluye el JSON-LD (todo derivado de la config — no hay que escribir schema a mano):

- `name`, `description`, `url`, `image`, `telephone`, `email`, `address`
- `openingHoursSpecification` (de `hours`, salta días `null`)
- `sameAs` (de `contact.social.*`, solo URLs válidas)
- `hasOfferCatalog` con cada servicio visible y su precio (post `visibleServices`/`serviceOverrides`)
- `currenciesAccepted`/`inLanguage` (ILS/he-IL en deploys hebreos)
- Script separado `FAQPage` cuando `features.showFaq` está activo y hay items

**Regla:** el schema refleja lo que la página muestra. No inflar la FAQ con preguntas que no están en la sección, no inventar rating/reviews (no emitimos `aggregateRating` porque no tenemos reviews verificables — agregar reviews falsas es penalizable).

Al agregar un **nicho nuevo**: agregar la entrada en `SCHEMA_TYPE` (useSchema.ts) + defaults en `seo-defaults.ts` (4 idiomas) — buscar el subtipo más específico en [schema.org/LocalBusiness](https://schema.org/LocalBusiness).

---

## 4. Meta tags por cliente — qué campo controla qué

| Tag | Campo Firestore (runtime) | Env var (build, gana) |
|---|---|---|
| `<title>` / `og:title` | `brand.name` + `brand.tagline` | `VITE_BRAND_NAME` + `VITE_BRAND_TAGLINE` |
| `meta description` / `og:description` | `brand.description` (fallback: tagline) | `VITE_BRAND_DESCRIPTION` |
| `og:image` / `twitter:image` | `brand.ogImage` → fallback `hero.backgroundImage` absoluta → default del nicho | `VITE_OG_IMAGE` |
| `og:site_name` / `og:image:alt` | `brand.name` | `VITE_BRAND_NAME` |
| canonical / `og:url` | — (origin del deploy) | `VITE_APP_URL` |
| favicon | `brand.faviconEmoji` (fallback: mapa por `logoIconName`) | `VITE_FAVICON_EMOJI` |
| `theme-color` | `theme.accent` | `VITE_THEME_ACCENT` |
| `<html lang>` / `og:locale` / hreflang | — | `VITE_UI_LANGUAGE` |

Escribir descriptions como un resultado de búsqueda: servicio + diferencial + ubicación + CTA. Malo: "El mejor barbershop". Bueno: "מספרה בוטיק ברעננה — תספורות מדויקות, עיצוב זקן וטיפולי פנים. קביעת תור אונליין."

---

## 5. Velocidad de carga (Core Web Vitals)

Ya resuelto en el template — **no romper**:

- `index.html` hace `preconnect` a Google Fonts y `dns-prefetch` a Unsplash/Firebase Storage/Firestore
- Imágenes hero (LCP): `loading="eager" fetchPriority="high" decoding="async"`. **Toda imagen above-the-fold nueva debe llevar esto**; todo lo below-the-fold lleva `loading="lazy"` (patrón existente, 105+ imágenes)
- Fonts con `display=swap`; secciones pesadas lazy-loaded (`React.Suspense`)

Reglas al crear webs:

1. **Imágenes de cliente:** servir desde Firebase Storage ya procesadas por el pipeline (`ig-to-web-pipeline` genera los 2x). No subir originales de 4MB — el hero es el LCP, apuntar a <300KB
2. **Unsplash:** siempre con `?auto=format&fit=crop&q=80&w=...` ajustado al tamaño real de render
3. **No agregar fonts nuevas** al `@import` global de `index.css` — usar `branding.fonts` (Firestore) que carga solo lo necesario vía `site-theme.ts`
4. **Objetivo:** PageSpeed móvil ≥ 85, LCP < 2.5s, CLS < 0.1. Si CLS falla, buscar imágenes sin dimensiones reservadas o fonts sin swap

---

## 6. Mobile-first indexing

Google indexa la versión móvil. El template ya es mobile-first (viewport meta, breakpoint navbar en `lg`, touch targets, dvh heroes). Al personalizar:

- QA visual SIEMPRE en móvil primero (el QA script ya hace sweep mobile + desktop)
- Mismo contenido en móvil y desktop — no esconder secciones enteras con `hidden md:block` para "limpiar" el móvil: lo que Google no ve en móvil, no rankea
- Texto base ≥ 16px, sin scroll horizontal (gotcha conocido: rails con overflow — ver memoria `rail-scroll-capture`)

---

## 7. i18n y SEO multiidioma

- Cada deploy es **un solo idioma canónico** (`VITE_UI_LANGUAGE`); el switcher de runtime no crea URLs nuevas, así que **no** hay hreflang entre idiomas distintos del mismo deploy — solo self-referencing + `x-default` (ya lo emite `useSEO`)
- Hebreo/árabe: `dir="rtl"` + `og:locale` `he_IL`/`ar_SA` automáticos
- La meta description debe estar en el idioma del deploy — Google la compara con el contenido visible
- Keywords locales: pensar cómo busca el cliente final ("מספרה בחולון", "тату салон в Хайфе"), no traducciones literales del inglés

---

## 8. Gotchas conocidos (no repetir)

1. **Env vars sin setear** = link previews con marca genérica del preset. Es el bug SEO más común de la flota
2. **Dominio agregado después del build** = canonical apuntando a `.vercel.app` → redeploy
3. **IDs de Unsplash muertos** (404 silencioso → placeholder SVG): HEAD-check antes de usar en `ogImage`/hero
4. **`mergeDeep` saltea `null`**: para anular un campo del preset usar `""` o `false`, no `null`
5. **`og:image` relativa sin `VITE_APP_URL`**: queda relativa y los scrapers no la resuelven — usar URL absoluta o setear `VITE_APP_URL`
6. **No tocar** `Disallow: /admin` y `/api/` de `robots.txt` — el panel admin no debe indexarse
7. **`isDemoMode: false`** antes de entregar: el tour driver.js no aporta a SEO y agrega JS

---

## 9. Qué NO hacer

- ❌ Keyword stuffing en title/description — un title natural con marca + servicio + ciudad alcanza
- ❌ `aggregateRating`/reviews inventadas en schema — penalización de Google
- ❌ Texto oculto para crawlers (`sr-only` con keywords, etc.)
- ❌ Bloquear CSS/JS en robots.txt — Google renderiza la SPA y necesita los assets
- ❌ Duplicar la misma description en todos los clientes del mismo nicho — personalizar siempre con nombre + zona
