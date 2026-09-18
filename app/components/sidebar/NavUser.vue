<script setup lang="ts">
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from '@lucide/vue'
import { PFP } from '~~/shared/misc/pfp'
import {
  useSidebar,
} from '@/components/ui/sidebar'

interface SidebarUser {
  firstName: string | null
  lastName: string | null
  email: string
  pfpId: number
  recipeCount: number
}

const props = defineProps<{
  user: SidebarUser
}>()

const { isMobile } = useSidebar()
const clerk = useClerk()

const fullName = computed(() =>
  [props.user.firstName, props.user.lastName].filter(Boolean).join(' '),
)

const recipeCountLabel = computed(() =>
  `${props.user.recipeCount} ${props.user.recipeCount === 1 ? 'recipe' : 'recipes'}`,
)

const initials = computed(() =>
  [props.user.firstName?.[0], props.user.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U',
)

async function signOut() {
  await clerk.value?.signOut({ redirectUrl: '/login' })
}
</script>

<template>
  <SidebarMenu class="border bg-white rounded-lg">
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-9 w-9 rounded-lg">
              <AvatarImage :src="`/kawaii-icons/${PFP[user.pfpId]}`" :alt="fullName" class="bg-accent" />
              <AvatarFallback class="rounded-lg">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-bold">{{ fullName }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ recipeCountLabel }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-9 w-9 rounded-full">
                <AvatarImage :src="`/kawaii-icons/${PFP[user.pfpId]}`" :alt="fullName" class="bg-accent" />
                <AvatarFallback class="rounded-lg">
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-bold">{{ fullName }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ recipeCountLabel }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Sparkles />
              Upgrade to Pro
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <BadgeCheck />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell />
              Notifications
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="signOut">
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
