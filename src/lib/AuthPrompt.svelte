<script lang="ts">
  import { rbFetch, RbError, userFromRaw } from "$lib/api";
  import { appState } from "$lib/state.svelte";

  interface Props {
    remaining: number;
    resetTimeSeconds: number;
  }

  let { remaining = $bindable(), resetTimeSeconds }: Props = $props();

  let errorMessage = $state("");
  let errorVisible = $state(false);
  let errorTimeout: number;
  let netID = $state("");
  const isOpen = $derived(appState.user === null);
  let tickTimeout: number;

  function tickTimer() {
    if (remaining <= 0) {
      clearTimeout(tickTimeout);
      netID = "";
      appState.user = null;
      return;
    }
    remaining -= 1;
  }

  $effect(() => {
    const dialog = document.getElementById("auth-prompt") as HTMLDialogElement;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  });

  async function submit() {
    try {
      const rawUser: any = await rbFetch(`/users/${netID}`);
      if (!rawUser.active) {
        showError(`"${netID}" is no longer an active user!`);
        return;
      }
      appState.user = userFromRaw(rawUser);
    } catch (err) {
      if (err instanceof RbError && err.status === 404) {
        showError(`"${netID}" is not a registered netID yet!`);
        return;
      } else {
        throw err;
      }
    }
    clearTimeout(tickTimeout);
    remaining = resetTimeSeconds;
    tickTimeout = setInterval(tickTimer, 1000);
  }

  function showError(msg: string) {
    clearTimeout(errorTimeout);
    errorMessage = msg;
    errorVisible = true;
    errorTimeout = setTimeout(() => {
      errorVisible = false;
    }, 3000);
  }
</script>

<dialog id="auth-prompt" oncancel={(e) => e.preventDefault()}>
  <form
    onsubmit={async (e) => {
      e.preventDefault();
      await submit();
    }}
  >
    <input placeholder="Enter netID" bind:value={netID} />
    <button>Login</button>
  </form>
  {#if errorVisible}
    <p>{errorMessage}</p>
  {/if}
</dialog>
