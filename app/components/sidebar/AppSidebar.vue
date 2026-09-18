<script setup lang="ts">
import type { SerializedRecipe } from '~~/shared/schemas/recipes'
import type { SidebarProps } from '@/components/ui/sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import NavCategories from './NavCategories.vue'
import NavMain from './NavMain.vue'
import NavUser from './NavUser.vue'
import NavUserSkeleton from './NavUserSkeleton.vue'
import SearchForm from './SearchForm.vue'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const { user, isLoaded } = useUser()
const { data: me } = useFetch('/api/me')

// Shares the dashboard list page's asyncData entry — see RecipeSearch for why
// the key has to be explicit — so the footer count costs no extra request and
// refetches whenever a recipe is added or deleted.
const { data: recipes } = useFetch('/api/recipes', {
  key: 'recipes',
  default: () => [] as SerializedRecipe[],
  dedupe: 'defer',
})

const sidebarUser = computed(() =>
  user.value && me.value && {
    firstName: user.value.firstName,
    lastName: user.value.lastName,
    email: user.value.primaryEmailAddress?.emailAddress ?? '',
    pfpId: me.value.pfpId,
    recipeCount: recipes.value.length,
  },
)
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader class="py-6 gap-4">
      <div class="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
        <NuxtLink to="/dashboard" class="group-data-[collapsible=icon]:hidden">
          <Logo class="h-6" />
        </NuxtLink>
        <SidebarTrigger />
      </div>
      <SearchForm class="group-data-[collapsible=icon]:hidden" />
    </SidebarHeader>
    <SidebarContent class="gap-5">
      <NavMain />
      <NavCategories />
    </SidebarContent>
    <SidebarFooter>
      <NavUser v-if="isLoaded && sidebarUser" :user="sidebarUser" />
      <NavUserSkeleton v-else />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
