<script setup lang="ts">
import { Check } from '@lucide/vue'
import { useRegleSchema } from '@regle/schemas'
import { PFP, pfpLabel } from '~~/shared/misc/pfp'
import { updateAccountSchema } from '~~/shared/schemas/account'

// Seeded once at setup, like RecipeForm, so the page has to mount this behind a
// `v-if` on the Clerk user and the `me` fetch.
const props = defineProps<{
  firstName: string
  lastName: string
  email: string
  pfpId: number
}>()

const { user } = useUser()

const { r$ } = useRegleSchema({
  firstName: props.firstName,
  lastName: props.lastName,
  pfpId: props.pfpId,
}, updateAccountSchema, {
  autoDirty: false,
})

const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)

const initials = computed(() =>
  [r$.$value.firstName[0], r$.$value.lastName[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U',
)

// The props follow a successful save — Clerk is reloaded and the `me` entry
// refetched — so this settles back to false on its own once the round trip
// lands, and the button has no separate "clean" flag to keep in step.
const changed = computed(() =>
  r$.$value.firstName.trim() !== props.firstName
  || r$.$value.lastName.trim() !== props.lastName
  || r$.$value.pfpId !== props.pfpId,
)

watch(() => ({ ...r$.$value }), () => {
  saved.value = false
})

async function onSubmit() {
  const { valid, data } = await r$.$validate()

  if (!valid || saving.value)
    return

  saving.value = true
  error.value = null

  try {
    await $fetch('/api/me', { method: 'PATCH', body: data })

    // The sidebar reads the name from Clerk and the avatar from `/api/me`, so
    // both copies have to be pulled again before it shows the new profile.
    await user.value?.reload()
    await refreshNuxtData('me')

    saved.value = true
  }
  catch {
    error.value = 'Those changes could not be saved. Please try again.'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="rounded-xl border bg-white p-6 flex flex-col gap-6" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-1">
      <h2 class="font-serif text-2xl font-medium">
        Profile
      </h2>
      <p class="text-sm text-muted-foreground">
        The name and the bean that sit at the bottom of your sidebar.
      </p>
    </div>

    <p v-if="error" class="rounded-lg border border-destructive bg-destructive/5 py-3 px-4 text-sm font-medium text-destructive">
      {{ error }}
    </p>

    <FieldSet :disabled="saving">
      <FieldGroup class="gap-6">
        <div class="flex items-center gap-5">
          <Avatar class="size-20 rounded-full border shrink-0">
            <AvatarImage
              :src="`/kawaii-icons/${PFP[r$.$value.pfpId]}`"
              :alt="pfpLabel(r$.$value.pfpId)"
              class="bg-accent p-1"
            />
            <AvatarFallback class="text-lg">
              {{ initials }}
            </AvatarFallback>
          </Avatar>
          <div class="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
            <Field :data-invalid="r$.firstName.$error" class="gap-1 flex-1">
              <FieldLabel for="account-first-name">
                First name
              </FieldLabel>
              <Input
                id="account-first-name"
                v-model="r$.$value.firstName"
                type="text"
                autocomplete="given-name"
                class="bg-white"
                :aria-invalid="r$.firstName.$error"
              />
            </Field>
            <Field :data-invalid="r$.lastName.$error" class="gap-1 flex-1">
              <FieldLabel for="account-last-name">
                Last name
              </FieldLabel>
              <Input
                id="account-last-name"
                v-model="r$.$value.lastName"
                type="text"
                autocomplete="family-name"
                class="bg-white"
                :aria-invalid="r$.lastName.$error"
              />
            </Field>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary/60 py-3 px-4">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </p>
            <p class="truncate text-sm">
              {{ props.email }}
            </p>
          </div>
          <p class="text-xs text-muted-foreground">
            Managed by your sign-in
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-0.5">
            <span id="account-pfp-label" class="text-sm font-medium">Profile picture</span>
            <span class="text-sm text-muted-foreground">Pick the bean that feels like you.</span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="account-pfp-label"
            class="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-2"
          >
            <!-- A real radio, visually hidden: arrow-key roving and the checked
                 state come from the browser rather than from a keydown handler. -->
            <label
              v-for="(icon, id) in PFP"
              :key="icon"
              class="relative flex aspect-square cursor-pointer items-center justify-center rounded-lg border bg-white p-1.5 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <input
                v-model="r$.$value.pfpId"
                type="radio"
                name="account-pfp"
                class="sr-only"
                :value="id"
              >
              <img :src="`/kawaii-icons/${icon}`" alt="" class="size-full object-contain">
              <span class="sr-only">{{ pfpLabel(id) }}</span>
            </label>
          </div>
        </div>
      </FieldGroup>
    </FieldSet>

    <div class="flex items-center justify-end gap-3 border-t pt-5">
      <p v-if="saved" class="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check :size="16" class="text-primary" />
        Saved
      </p>
      <Button type="submit" :disabled="saving || !changed">
        {{ saving ? "Saving…" : "Save changes" }}
      </Button>
    </div>
  </form>
</template>
