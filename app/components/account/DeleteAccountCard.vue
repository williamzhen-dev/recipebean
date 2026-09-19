<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'

const props = defineProps<{
  recipeCount: number
}>()

// Long enough that it cannot be typed by accident, short enough to be typed
// once without resentment.
const CONFIRMATION = 'delete'

const clerk = useClerk()

const open = ref(false)
const confirmation = ref('')
const deleting = ref(false)
const error = ref<string | null>(null)

const confirmed = computed(() =>
  confirmation.value.trim().toLowerCase() === CONFIRMATION,
)

const recipeLabel = computed(() =>
  `${props.recipeCount} ${props.recipeCount === 1 ? 'recipe' : 'recipes'}`,
)

watch(open, (isOpen) => {
  if (!isOpen) {
    confirmation.value = ''
    error.value = null
  }
})

async function onDelete() {
  if (!confirmed.value || deleting.value)
    return

  deleting.value = true
  error.value = null

  try {
    await $fetch('/api/me', { method: 'DELETE' })
  }
  catch {
    error.value = 'Your account could not be deleted. Please try again.'
    deleting.value = false
    return
  }

  // The Clerk user is already gone, so this is only clearing the local session.
  // It can reject on a session Clerk no longer knows about; either way the
  // browser has to end up off the dashboard, hence the fallback.
  try {
    await clerk.value?.signOut({ redirectUrl: '/' })
  }
  catch {
    await navigateTo('/', { external: true })
  }
}
</script>

<template>
  <section class="rounded-xl border border-destructive/40 bg-destructive/5 p-6 flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h2 class="flex items-center gap-2 font-serif text-2xl font-medium text-destructive">
        <TriangleAlert :size="20" />
        Delete account
      </h2>
      <p class="max-w-prose text-sm text-muted-foreground">
        This removes your account, your {{ recipeLabel }}, every photo you have
        uploaded and all of your collections. Nothing can be recovered
        afterwards.
      </p>
    </div>

    <Dialog v-model:open="open">
      <DialogTrigger as-child>
        <Button type="button" variant="destructive" class="w-fit">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your {{ recipeLabel }} and their photos will be deleted permanently.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <p v-if="error" class="rounded-lg border border-destructive bg-destructive/5 py-3 px-4 text-sm font-medium text-destructive">
          {{ error }}
        </p>

        <Field class="gap-1">
          <FieldLabel for="account-delete-confirmation">
            Type <span class="font-bold">{{ CONFIRMATION }}</span> to confirm
          </FieldLabel>
          <Input
            id="account-delete-confirmation"
            v-model="confirmation"
            type="text"
            autocomplete="off"
            :disabled="deleting"
            class="bg-white"
          />
        </Field>

        <DialogFooter>
          <DialogClose as-child>
            <Button type="button" variant="outline" :disabled="deleting">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            :disabled="!confirmed || deleting"
            @click="onDelete"
          >
            {{ deleting ? "Deleting…" : "Delete account" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
