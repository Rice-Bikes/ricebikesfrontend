<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    callback: (input: string) => void;
    preedit?: Snippet | null;
    type?: string;
    pattern?: string | null;
    placeholder?: string;
    initial?: string;
  }

  let {
    callback,
    preedit = null,
    type = "text",
    pattern = null,
    placeholder = "",
    initial = "",
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initial);
  let canEdit = $state(false);
</script>

{#if canEdit}
  <form
    style="display: inline"
    onsubmit={async (e) => {
      e.preventDefault();
      callback(value);
      initial = value;
      canEdit = false;
    }}
  >
    <!-- svelte-ignore a11y_autofocus -->
    <input
      autofocus
      bind:value
      {type}
      {placeholder}
      {pattern}
      onkeydown={(e) => {
        if (e.key === "Escape") {
          value = initial;
          canEdit = false;
        }
      }}
    />
    <button>Finish</button>
  </form>
{:else}
  {#if preedit !== null}
    {@render preedit()}
  {:else}
    <input disabled bind:value {placeholder} />
  {/if}
  <button onclick={() => (canEdit = true)}>Edit</button>
{/if}
