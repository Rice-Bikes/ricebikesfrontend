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
  }

  const {
    data,
    render,
    key,
    searchKeys,
    callback: onSelected,
    searchLimit = 10,
    placeholder = "",
  }: Props = $props();

  let searchInput = $state("");
  const fuse = $derived(
    new Fuse(data, { keys: searchKeys as FuseOptionKey<T>[], threshold: 0.4 }),
  );

  let filtered = $derived.by(() => {
    if (searchInput.length === 0) {
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
  onkeydown={(e) => {
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      onSelected(filtered[0]);
      searchInput = "";
    }
  }}
/>
<ol>
  {#each filtered as row (key(row))}
    <li onclick={() => onSelected(row)}>
      {@render render(row)}
    </li>
  {/each}
</ol>
