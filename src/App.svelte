<script lang="ts">
  import Router from "svelte-spa-router";
  import Home from "./pages/Home.svelte";
  import Settings from "./pages/Settings.svelte";
  import TransactionPage from "./pages/TransactionPage.svelte";
  import AuthPrompt from "$lib/AuthPrompt.svelte";
  import { appState } from "$lib/state.svelte";

  let authResetRemaining = $state(0);
  const routes = {
    "/": Home,
    "/settings": Settings,
    "/transaction/:id": TransactionPage,
  };
</script>

<AuthPrompt bind:remaining={authResetRemaining} resetTimeSeconds={60 * 7} />
<header>
  <a href="#/">Home</a>
  <a href="#/settings">Settings</a>
  {#if appState.user}
    <span
      >{appState.user.firstName}
      {appState.user.lastName} ({appState.user.netID})</span
    >
  {:else}
    <span>Anonymous</span>
  {/if}
  <span>{authResetRemaining}</span>
</header>
<main>
  <Router {routes} />
</main>
