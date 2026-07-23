<script lang="ts">
  import Router from "svelte-spa-router";
  import Home from "./pages/Home.svelte";
  import Settings from "./pages/Settings.svelte";
  import TransactionPage from "./pages/TransactionPage.svelte";
  import AuthPrompt from "$lib/AuthPrompt.svelte";
  import { appState } from "$lib/state.svelte";
  import { themeState, toggleTheme } from "$lib/theme.svelte";
  import Sun from "$lib/icons/Sun.svelte";
  import Moon from "$lib/icons/Moon.svelte";

  let authResetRemaining = $state(0);
  const routes = {
    "/": Home,
    "/settings": Settings,
    "/transaction/:id": TransactionPage,
  };
</script>

<AuthPrompt bind:remaining={authResetRemaining} resetTimeSeconds={60 * 7} />
<header class="app-header">
  <a href="#/">Home</a>
  <a href="#/settings">Settings</a>
  <span class="spacer"></span>
  {#if appState.user}
    <span class="user-info"
      >{appState.user.firstName}
      {appState.user.lastName} ({appState.user.netID}) &middot; {authResetRemaining}s</span
    >
  {:else}
    <span class="user-info">Anonymous</span>
  {/if}
  <button
    class="icon-btn"
    aria-label={themeState.value === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"}
    onclick={toggleTheme}
  >
    {#if themeState.value === "dark"}
      <Sun />
    {:else}
      <Moon />
    {/if}
  </button>
</header>
<main>
  <Router {routes} />
</main>
