<script setup lang="ts">
import type { ImportedRecipeResponse } from '~~/shared/schemas/recipes'
import { Link2, Loader2 } from '@lucide/vue'

const props = defineProps<{
  /** Warns that importing replaces work already in the form. */
  formHasContent?: boolean
}>()

const emit = defineEmits<{
  imported: [recipe: ImportedRecipeResponse]
}>()

const open = defineModel<boolean>('open', { required: true })

const url = ref('')
const importing = ref(false)
const error = ref<string | null>(null)

// The server names the failure; the wording lives here so the route file holds
// no user-facing English. Anything unrecognised falls back to the generic line.
const MESSAGES: Record<string, string> = {
  'bad-url': 'That does not look like a recipe link.',
  'blocked': 'That site refused the import. You can still add the recipe by hand.',
  'not-found': 'There is no page at that link.',
  'no-recipe': 'That page does not publish recipe data we can read. Try the printable version of the recipe, or add it by hand.',
  'timeout': 'That site took too long to answer. Try again.',
  'too-large': 'That page is too large to import.',
  'unsupported': 'That link is not a web page.',
  'unreachable': 'We could not reach that site.',
}

async function submit() {
  const target = url.value.trim()

  if (importing.value || target.length === 0)
    return

  importing.value = true
  error.value = null

  try {
    const recipe = await $fetch('/api/import/recipe', {
      method: 'POST',
      body: { url: target },
    })

    emit('imported', recipe)
    url.value = ''
    open.value = false
  }
  catch (err) {
    // H3 nests the createError `data` under the response body's own `data` key.
    const reason = (err as { data?: { data?: { reason?: string } } })?.data?.data?.reason
    error.value = (reason && MESSAGES[reason]) || 'That recipe could not be imported. Please try again.'
  }
  finally {
    importing.value = false
  }
}

// Reopening after a failure should start clean, but keep the typed URL so a
// cook can fix a typo instead of pasting again.
watch(open, (isOpen) => {
  if (isOpen)
    error.value = null
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="font-serif text-2xl">
          Import from a link
        </DialogTitle>
        <DialogDescription>
          Paste a recipe page. We read the recipe the site publishes for search
          engines, then fill in the form so you can check it before you save.
        </DialogDescription>
      </DialogHeader>

      <Field class="gap-1">
        <FieldLabel for="recipe-import-url">
          Recipe link
        </FieldLabel>
        <Input
          id="recipe-import-url"
          v-model="url"
          type="url"
          inputmode="url"
          placeholder="https://www.skinnytaste.com/lasagna-recipe/"
          :aria-invalid="Boolean(error)"
          :disabled="importing"
          @keydown.enter.prevent="submit"
        />
      </Field>

      <p v-if="props.formHasContent" class="text-sm text-muted-foreground">
        This replaces everything currently in the form.
      </p>

      <p v-if="error" class="rounded-lg border border-destructive/50 bg-destructive/5 py-3 px-4 text-sm text-destructive">
        {{ error }}
      </p>

      <DialogFooter>
        <DialogClose as-child>
          <Button type="button" variant="outline" :disabled="importing">
            Cancel
          </Button>
        </DialogClose>
        <Button type="button" :disabled="importing || url.trim().length === 0" @click="submit">
          <Loader2 v-if="importing" :size="16" class="animate-spin" />
          <Link2 v-else :size="16" />
          {{ importing ? "Importing…" : "Import" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
