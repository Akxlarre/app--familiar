# app-file-upload

FileUpload UX Premium 2026 — dropzone con drag & drop, dragover/dragleave, templates, hint calculado y animaciones GSAP.

## Propósito

Subida de archivos con dropzone personalizada, validaciones (maxFileSize, maxFiles, accept), hint calculado o custom, y animación de entrada para cada archivo.

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `chooseLabel` | `string` | `'Elegir archivos'` | Etiqueta del botón |
| `chooseIcon` | `string` | `'pi pi-upload'` | Icono del botón |
| `multiple` | `boolean` | `true` | Permitir múltiples archivos |
| `accept` | `string` | — | Tipos aceptados (ej: `image/*`, `.pdf`) |
| `maxFileSize` | `number` | — | Tamaño máximo por archivo (bytes) |
| `maxFiles` | `number` | — | Número máximo de archivos |
| `disabled` | `boolean` | `false` | Deshabilitado |
| `hint` | `string` | — | Hint custom. Si no se pasa, se calcula desde maxFileSize/maxFiles |

## Slots (content projection)

| Slot | Selector | Descripción |
|------|----------|-------------|
| Header | `[header]` | Contenido arriba del dropzone |
| Empty | `[empty]` | Contenido extra en estado vacío |

## Outputs

| Output | Descripción |
|--------|-------------|
| `filesChange` | Emitido al cambiar la selección (`File[]`) |

## Ejemplo

```html
<app-file-upload
  chooseLabel="Subir fotos"
  accept="image/*"
  [maxFiles]="3"
  [maxFileSize]="2097152"
  hint="Máx. 2 MB por imagen, 3 archivos"
  (filesChange)="uploadedFiles.set($event)"
/>
```

## Cuándo usarlo

- Formularios que requieren adjuntar archivos
- Subida de documentos, imágenes, PDFs

## Cuándo no usarlo

- Si necesitas upload automático a servidor (usar p-fileupload directamente con `url`)
- Si necesitas preview avanzado o templates custom
