# dev-fixtures/media (ignorado por git)

Material de prueba local para el hero con vídeo. No se commitea: el clip de prueba
(Mixkit 16044, licencia no verificada) sólo sirve para ver el prototipo en `dev:peluqueria:demo`.

Regenerar (ffmpeg ≥ 6, desde un clip cualquiera `src.mp4`):

```bash
# bucle 7,5 s sin costura (fundido cruzado cola→cabeza), 720p H.264 CRF 28, faststart, mudo
ffmpeg -ss 2 -t 8 -i src.mp4 -an -c:v copy trim.mp4
ffmpeg -i trim.mp4 -i trim.mp4 -filter_complex "[0:v]trim=0:7.5,setpts=PTS-STARTPTS[a];[1:v]trim=7.5:8,setpts=PTS-STARTPTS[b];[b][a]xfade=transition=fade:duration=0.5:offset=0,scale=-2:720[o]" -map "[o]" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -an dev-fixtures/media/hero-demo.mp4
ffmpeg -i dev-fixtures/media/hero-demo.mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -cpu-used 2 -an dev-fixtures/media/hero-demo.webm
ffmpeg -i dev-fixtures/media/hero-demo.mp4 -frames:v 1 -c:v libaom-av1 -still-picture 1 -crf 30 dev-fixtures/media/hero-demo-poster.avif
ffmpeg -i dev-fixtures/media/hero-demo.mp4 -frames:v 1 -q:v 75 dev-fixtures/media/hero-demo-poster.jpg
```

Límites (DESIGN-PELUQUERIA.md): 6–10 s, ≤ 1 MB móvil / ≤ 2,5 MB escritorio; póster AVIF del primer cuadro.
