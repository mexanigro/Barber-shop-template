# dev-fixtures/media (ignorado por git)

Material de prueba local para el hero con vídeo. No se commitea: sólo sirve para ver el
prototipo en `dev:peluqueria:demo`. Dos clips por prospecto (`hero.video` + `hero.video.portrait`):
el horizontal para apaisado y el 9:16 para móvil (`<source media="(orientation: portrait)">`).

Fuente actual: Mixkit 51997 «Portrait of a young woman with abundant curly hair modeling»
(1920×1080, 24 fps, 14 s), **Mixkit Stock Video Free License** (leída el 2026-09-18 en
`mixkit.co/license/#videoFree`: uso comercial, modificación y distribución permitidos, sin
atribución). Ojo: muchos clips de pelo de Mixkit (16044, 33257, 33099, 38414, 16189, 12955) están
bajo la **Restricted License** (sólo proyectos personales): antes de usar un clip, comprobar
`data-license="videoFree"` en su página. El 9:16 es un recorte central del mismo clip (no existe
stock vertical de peluquería con licencia legible en Coverr/Mixkit; Pexels y Pixabay bloquean el
acceso automatizado).

Regenerar (ffmpeg ≥ 6, desde `src.mp4`):

```bash
# 8 s intra-limpios a partir del segundo 1
ffmpeg -ss 1 -t 8 -i src.mp4 -an -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p trim.mp4
# horizontal: bucle 7,5 s sin costura (fundido cola→cabeza), 720p H.264 CRF 21, faststart, mudo
ffmpeg -i trim.mp4 -i trim.mp4 -filter_complex "[0:v]trim=0:7.5,setpts=PTS-STARTPTS[a];[1:v]trim=7.5:8,setpts=PTS-STARTPTS[b];[b][a]xfade=transition=fade:duration=0.5:offset=0,scale=-2:720[o]" -map "[o]" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -an dev-fixtures/media/hero-demo.mp4
# 9:16: recorte central 608×1080 (sujeto centrado), CRF 25 para quedar ≤ 1,5 MB
ffmpeg -i trim.mp4 -i trim.mp4 -filter_complex "[0:v]trim=0:7.5,setpts=PTS-STARTPTS[a];[1:v]trim=7.5:8,setpts=PTS-STARTPTS[b];[b][a]xfade=transition=fade:duration=0.5:offset=0,crop=608:1080:656:0[o]" -map "[o]" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -an dev-fixtures/media/hero-demo-v.mp4
ffmpeg -i dev-fixtures/media/hero-demo.mp4 -c:v libvpx-vp9 -b:v 0 -crf 29 -row-mt 1 -cpu-used 2 -an dev-fixtures/media/hero-demo.webm
ffmpeg -i dev-fixtures/media/hero-demo-v.mp4 -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -cpu-used 2 -an dev-fixtures/media/hero-demo-v.webm
ffmpeg -i dev-fixtures/media/hero-demo.mp4 -frames:v 1 -c:v libaom-av1 -still-picture 1 -crf 30 dev-fixtures/media/hero-demo-poster.avif
ffmpeg -i dev-fixtures/media/hero-demo-v.mp4 -frames:v 1 -c:v libaom-av1 -still-picture 1 -crf 32 dev-fixtures/media/hero-demo-v-poster.avif
```

Pesos medidos (2026-09-18, CRF bajado por orden de Liam: la calidad era del stock y del CRF alto): horizontal 720p CRF 21 = 2,06 MB mp4 / 1,63 MB webm; vertical 608×1080 CRF 25 = 1,50 MB mp4 / 1,24 MB webm;
pósters AVIF 15 KB. Límites (DESIGN-PELUQUERIA.md): 6–10 s, ≤ 1,5 MB móvil / ≤ 3 MB escritorio; se confirman con el primer clip generado por Liam.
