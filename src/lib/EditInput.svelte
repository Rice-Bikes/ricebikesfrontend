<script lang="ts">
  import type { Snippet } from "svelte";
  import Pencil from "$lib/icons/Pencil.svelte";
  import Check from "$lib/icons/Check.svelte";

  interface Props {
    callback: (input: string) => void;
    preedit?: Snippet | null;
    type?: string;
    pattern?: string | null;
    placeholder?: string;
    initial?: string;
    formatter?: (input: string) => string;
  }

  let {
    callback,
    preedit = null,
    type = "text",
    pattern = null,
    placeholder = "",
    initial = "",
    formatter = undefined,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initial);
  let canEdit = $state(false);
</script>

{#if canEdit}
  <form
    class="field-row"
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
      oninput={(e) => {
        if (formatter) {
          value = formatter(e.currentTarget.value);
        }
      }}
      onkeydown={(e) => {
        if (e.key === "Escape") {
          value = initial;
          canEdit = false;
        }
      }}
    />
    <button class="icon-btn success" aria-label="Save"><Check /></button>
  </form>
{:else}
  <span class="field-row">
    {#if preedit !== null}
      {@render preedit()}
    {:else}
      <input disabled bind:value {placeholder} />
    {/if}
    <button class="icon-btn" aria-label="Edit" onclick={() => (canEdit = true)}
      ><Pencil /></button
    >
  </span>
{/if}
