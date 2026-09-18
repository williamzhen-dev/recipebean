<script setup lang="ts">
import type { SerializedRecipe } from '~~/shared/schemas/recipes'
import DeleteAccountCard from '~/components/account/DeleteAccountCard.vue'
import ProfileForm from '~/components/account/ProfileForm.vue'

definePageMeta({
  layout: 'dashboard',
})

const { user, isLoaded } = useUser()

// Keyed so this shares the sidebar's entry: the avatar shown here and the one
// in the footer are the same fetch, and saving refreshes both at once.
const { data: me } = await useFetch('/api/me', { key: 'me' })

// Shares the dashboard list page's entry — see RecipeSearch for why the key has
// to be explicit — so the delete warning can name a count for free.
const { data: recipes } = await useFetch('/api/recipes', {
  key: 'recipes',
  default: () => [] as SerializedRecipe[],
  dedupe: 'defer',
})

const profile = computed(() =>
  user.value && me.value && {
    firstName: user.value.firstName ?? '',
    lastName: user.value.lastName ?? '',
    email: user.value.primaryEmailAddress?.emailAddress ?? '',
    pfpId: me.value.pfpId,
  },
)
</script>

<template>
  <div class="flex flex-col gap-6 py-6 px-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-4xl font-serif font-medium">
        Account
      </h1>
      <p class="text-sm text-muted-foreground">
        Your profile, and the door out.
      </p>
    </header>

    <div class="flex flex-col gap-6 max-w-3xl">
      <ProfileForm
        v-if="isLoaded && profile"
        v-bind="profile"
      />
      <div v-else class="rounded-xl border bg-white p-6 flex flex-col gap-6">
        <Skeleton class="h-7 w-32" />
        <div class="flex items-center gap-5">
          <Skeleton class="size-20 rounded-full shrink-0" />
          <div class="flex flex-col sm:flex-row gap-3 flex-1">
            <Skeleton class="h-10 flex-1" />
            <Skeleton class="h-10 flex-1" />
          </div>
        </div>
        <Skeleton class="h-16 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>

      <DeleteAccountCard :recipe-count="recipes.length" />
    </div>
  </div>
</template>
