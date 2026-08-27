<script setup lang="ts">
import type { UploadedFile } from '~~/shared/schemas/files'
import { ImagePlus, Loader2, X } from '@lucide/vue'
import { cn } from '~/lib/utils'
import { ImageProcessingError, processImage } from '~/utils/image'

const props = defineProps<{
  /** Banner already saved on the recipe, for the edit form. */
  initialUrl?: string | null
}>()

// The file id, assigned once the upload lands. The recipe form submits this and
// the server flips the row from `pending` to `attached`.
const fileId = defineModel<string | null>({ required: true })

const dropZone = useTemplateRef<HTMLDivElement>('dropZone')

const previewUrl = ref<string | null>(null)
const uploading = ref(false)
const error = ref<string | null>(null)

// A local preview wins. Otherwise fall back to the saved banner, but only while
// the model still holds an id — clearing the image must clear the banner too.
const displayUrl = computed(() => previewUrl.value ?? (fileId.value ? props.initialUrl ?? null : null))

function clearPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

async function upload(file: File) {
  if (uploading.value)
    return

  error.value = null
  uploading.value = true

  try {
    // Downscale before sending. `sharp` cannot run on Workers, so this is where
    // resizing happens.
    const { blob } = await processImage(file)

    clearPreview()
    previewUrl.value = URL.createObjectURL(blob)

    const uploaded = await $fetch<UploadedFile>('/api/files', {
      method: 'POST',
      body: blob,
      headers: { 'content-type': blob.type },
    })

    // Replacing an image just drops the old id. That row stays `pending` and
    // the nightly sweep collects it.
    fileId.value = uploaded.id
  }
  catch (err) {
    clearPreview()
    fileId.value = null
    error.value = err instanceof ImageProcessingError
      ? err.message
      : 'That image could not be uploaded. Please try again.'
  }
  finally {
    uploading.value = false
  }
}

const { open, onChange } = useFileDialog({ accept: 'image/*', multiple: false })

onChange((files) => {
  const file = files?.[0]
  if (file)
    upload(file)
})

const { isOverDropZone } = useDropZone(dropZone, {
  dataTypes: types => types.every(type => type.startsWith('image/')),
  onDrop(files) {
    const file = files?.[0]
    if (file)
      upload(file)
  },
})

function remove() {
  clearPreview()
  fileId.value = null
  error.value = null
}

onBeforeUnmount(clearPreview)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div
      ref="dropZone"
      :class="cn(
        'relative flex items-center justify-center w-full h-65 rounded-xl bg-muted overflow-hidden transition-colors',
        isOverDropZone && 'ring-2 ring-primary ring-offset-2',
        error && 'ring-2 ring-destructive',
      )"
    >
      <img
        v-if="displayUrl"
        :src="displayUrl"
        alt="Recipe banner preview"
        :class="cn('absolute inset-0 h-full w-full object-cover', uploading && 'opacity-50')"
      >

      <button
        v-if="!displayUrl"
        type="button"
        class="flex flex-col items-center gap-2 text-muted-foreground min-h-11 px-4"
        :disabled="uploading"
        @click="open()"
      >
        <ImagePlus :size="24" />
        <span class="text-sm font-medium">Upload image</span>
        <span class="text-xs">Tap to browse, or drop a photo here</span>
      </button>

      <div v-if="uploading" class="absolute inset-0 flex items-center justify-center">
        <Loader2 :size="24" class="animate-spin text-muted-foreground" />
        <span class="sr-only">Uploading image</span>
      </div>

      <Button
        v-if="displayUrl && !uploading"
        type="button"
        size="icon"
        variant="secondary"
        class="absolute top-2 right-2 rounded-full"
        aria-label="Remove image"
        @click="remove"
      >
        <X :size="18" />
      </Button>
    </div>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
      <button type="button" class="underline underline-offset-2" @click="open()">
        Try again
      </button>
    </p>
  </div>
</template>
