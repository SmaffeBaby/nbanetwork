<template>
  <header class="fixed left-0 top-0 z-50 hidden w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl min-[1180px]:block">
    <div class="mx-auto flex h-[88px] w-full max-w-[1840px] items-center px-[20px] lg:px-[28px] 2xl:px-[48px]">
      <RouterLink to="/" class="flex shrink-0 items-center">
        <img src="/logos/logo-nba-mom.svg" alt="NBA MOM Logo" class="h-[48px] w-[178px] object-contain object-left 2xl:w-[210px]"/>
      </RouterLink>

      <nav class="mx-auto flex h-full items-center gap-[28px] text-[16px] font-bold text-slate-700 2xl:gap-[44px] 2xl:text-[18px]">
        <RouterLink
            :to="newsLink.to"
            class="flex h-full items-center border-b-2 border-transparent px-1 transition hover:text-blue-700"
            :class="newsLink.isActive ? 'border-blue-600 text-blue-700' : ''"
        >
          {{ newsLink.label }}
        </RouterLink>

        <RouterLink
            :to="gamesLink.to"
            class="flex h-full items-center border-b-2 border-transparent px-1 transition hover:text-blue-700"
            :class="gamesLink.isActive ? 'border-blue-600 text-blue-700' : ''"
        >
          {{ gamesLink.label }}
        </RouterLink>

        <div class="group relative flex h-full items-center">
          <button
              type="button"
              class="inline-flex h-full items-center gap-1.5 border-b-2 border-transparent px-1 font-bold transition hover:text-blue-700 focus:outline-none group-hover:text-blue-700 group-focus-within:text-blue-700"
              :class="seasonIsActive ? 'border-blue-600 text-blue-700' : ''"
          >
            Сезон
            <ChevronDownIcon class="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180" />
          </button>

          <div class="invisible absolute left-1/2 top-full w-[280px] -translate-x-1/2 pt-3 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl shadow-slate-900/12">
              <RouterLink
                  v-for="item in seasonLinks"
                  :key="item.label"
                  :to="item.to"
                  class="flex items-start gap-3 rounded-lg px-3 py-3 transition hover:bg-slate-50"
                  :class="item.isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700'"
              >
                <component :is="item.icon" class="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <span class="block text-[15px] font-extrabold leading-5">{{ item.label }}</span>
                  <span class="mt-0.5 block text-[13px] font-medium leading-4 text-slate-500">{{ item.description }}</span>
                </span>
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="group relative flex h-full items-center">
          <RouterLink
              to="/teams"
              class="inline-flex h-full items-center gap-1.5 border-b-2 border-transparent px-1 font-bold transition hover:text-blue-700 focus:outline-none group-hover:text-blue-700 group-focus-within:text-blue-700"
              :class="teamsIsActive ? 'border-blue-600 text-blue-700' : ''"
          >
            Команды
            <ChevronDownIcon class="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180" />
          </RouterLink>

          <div class="invisible absolute left-1/2 top-full w-[660px] -translate-x-1/2 pt-3 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl shadow-slate-900/12">
              <div class="grid grid-cols-2 divide-x divide-slate-100">
                <div
                    v-for="conference in conferenceTeams"
                    :key="conference.title"
                    class="p-[14px]"
                >
                  <div class="mb-[8px] flex items-center justify-between gap-3">
                    <p class="text-[15px] font-extrabold text-slate-950">{{ conference.title }}</p>

                  </div>

                  <div class="grid gap-[3px]">
                    <RouterLink
                        v-for="team in conference.teams"
                        :key="team.abbr"
                        :to="`/team/${team.abbr}`"
                        class="group/team flex min-w-0 items-center gap-[8px] rounded-lg px-[6px] py-[3px] transition hover:bg-slate-50"
                    >
                      <span class="inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                        <img
                            :src="team.logo"
                            :alt="team.name"
                            class="h-[18px] w-[18px] object-contain"
                            loading="lazy"
                        />
                      </span>
                      <span class="min-w-0 truncate text-[12px] font-bold leading-[16px] text-slate-600 transition group-hover/team:text-blue-700">
                        {{ team.name }}
                      </span>
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RouterLink
            :to="playersLink.to"
            class="flex h-full items-center border-b-2 border-transparent px-1 transition hover:text-blue-700"
            :class="playersLink.isActive ? 'border-blue-600 text-blue-700' : ''"
        >
          {{ playersLink.label }}
        </RouterLink>

        <div class="group relative flex h-full items-center">
          <button
              type="button"
              class="inline-flex h-full items-center gap-1.5 border-b-2 border-transparent px-1 font-bold transition hover:text-blue-700 focus:outline-none group-hover:text-blue-700 group-focus-within:text-blue-700"
              :class="moreIsActive ? 'border-blue-600 text-blue-700' : ''"
          >
            Ещё
            <ChevronDownIcon class="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180" />
          </button>

          <div class="invisible absolute left-1/2 top-full w-[560px] -translate-x-1/2 pt-3 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div class="grid overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl shadow-slate-900/12">
              <div class="grid grid-cols-[1fr_190px]">
                <div class="space-y-3 p-5">
                  <RouterLink
                      v-for="item in featuredLinks"
                      :key="item.label"
                      :to="item.to"
                      class="group/item flex min-w-0 items-start gap-4 rounded-lg p-1.5 transition hover:bg-slate-50"
                  >
                    <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm transition group-hover/item:border-blue-100 group-hover/item:text-blue-700">
                      <component :is="item.icon" class="h-5 w-5" />
                    </span>
                    <span class="min-w-0">
                      <span class="block text-[16px] font-extrabold leading-5 text-slate-950 transition group-hover/item:text-blue-700">{{ item.label }}</span>
                      <span class="mt-0.5 block text-[13px] font-medium leading-4 text-slate-500">{{ item.description }}</span>
                    </span>
                  </RouterLink>
                </div>

                <div class="bg-slate-50 px-5 py-5">
                  <p class="text-[15px] font-extrabold text-slate-950">Разделы NBA MOM</p>
                  <div class="mt-4 space-y-4">
                    <RouterLink
                        v-for="item in categoryLinks"
                        :key="item.label"
                        :to="item.to"
                        class="block text-[14px] font-bold leading-5 text-slate-500 transition hover:text-blue-700"
                    >
                      {{ item.label }}
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-3 xl:gap-4">
        <NotificationsBell />
        <AuthPanel />
      </div>
    </div>
  </header>

  <HeaderBurger />
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AuthPanel from '../Auth/AuthPanel.vue'
import HeaderBurger from './HeaderBurger.vue'
import NotificationsBell from './NotificationsBell.vue'
import { useHeader } from '../../composables/Headers/useHeader'

const {
  categoryLinks,
  conferenceTeams,
  ChevronDownIcon,
  featuredLinks,
  gamesLink,
  moreIsActive,
  newsLink,
  playersLink,
  seasonIsActive,
  seasonLinks,
  teamsIsActive
} = useHeader()
</script>
