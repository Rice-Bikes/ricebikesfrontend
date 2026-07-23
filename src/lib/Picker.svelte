<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import Fuse from "fuse.js";
  import type { FuseOptionKey } from "fuse.js";

  interface Props {
    data: T[];
    render: Snippet<[T]>;
    key: (row: T) => any;
    searchKeys: (keyof T)[];
    callback: (row: T) => void;
    searchLimit?: number;
    placeholder?: string;
    popover?: boolean;
    id?: number;
  }

  const {
    data,
    render,
    key,
    searchKeys,
    callback: onSelected,
    searchLimit = 10,
    placeholder = "",
    popover = false,
  }: Props = $props();

  let searchInput = $state("");
  const fuse = $derived(
    new Fuse(data, { keys: searchKeys as FuseOptionKey<T>[], threshold: 0.4 }),
  );

  const id = crypto.randomUUID();

  let filtered = $derived.by(() => {
    if (searchInput.length === 0 && popover) {
      return [];
    }
    return fuse
      .search(searchInput)
      .map((result) => result.item)
      .slice(0, searchLimit);
  });
</script>

<input
  bind:value={searchInput}
  {placeholder}
  style="width: 100%; margin-bottom: var(--space-3); anchor-name: --picker-input-{id};"
  onkeydown={(e) => {
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      onSelected(filtered[0]);
      searchInput = "";
    }
  }}
/>
{#if filtered.length > 0}
  <div
    id="filtered-list"
    popover={popover ? "auto" : undefined}
    style={popover
      ? `position-anchor: --picker-input-${id}; position: absolute; width: anchor-size(width); position-area: bottom; display: block; overflow-y: auto; max-height: 100%`
      : "overflow-y: scroll;"}
  >
    <ol class="picker-list">
      {#each filtered as row (key(row))}
        <li>
          <button
            onclick={(e) => {
              e.preventDefault();
              onSelected(row);
            }}
          >
            {@render render(row)}
          </button>
        </li>
      {/each}
    </ol>
  </div>
{/if}
