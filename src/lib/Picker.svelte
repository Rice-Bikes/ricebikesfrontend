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

  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (
          Number(c) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] &
            (15 >> (Number(c) / 4)))
        ).toString(16),
      );

  const DEBOUNCE_MS = 75;
  let debouncedSearchInput = $state("");
  $effect(() => {
    const value = searchInput;
    const timeout = setTimeout(() => {
      debouncedSearchInput = value;
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  });

  let filtered = $derived.by(() => {
    if (debouncedSearchInput.length === 0 && popover) {
      return [];
    }
    return fuse
      .search(debouncedSearchInput)
      .map((result) => result.item)
      .slice(0, searchLimit);
  });

  let inputEl = $state<HTMLInputElement | undefined>();
  let listEl = $state<HTMLElement | undefined>();

  function positionList() {
    if (inputEl === undefined || listEl === undefined) {
      return;
    }
    const rect = inputEl.getBoundingClientRect();
    listEl.style.top = `${rect.bottom}px`;
    listEl.style.left = `${rect.left}px`;
    listEl.style.width = `${rect.width}px`;
  }

  $effect(() => {
    if (!popover || listEl === undefined) {
      return;
    }
    if (filtered.length > 0) {
      if (!listEl.matches(":popover-open")) {
        positionList();
        listEl.showPopover();
      }
    } else if (listEl.matches(":popover-open")) {
      listEl.hidePopover();
    }
  });

  $effect(() => {
    if (!popover || listEl === undefined) {
      return;
    }
    window.addEventListener("resize", positionList);
    window.addEventListener("scroll", positionList, true);
    return () => {
      window.removeEventListener("resize", positionList);
      window.removeEventListener("scroll", positionList, true);
    };
  });
</script>

<input
  bind:this={inputEl}
  bind:value={searchInput}
  {placeholder}
  style="width: 100%; margin-bottom: var(--space-3);"
  onkeydown={(e) => {
    if (e.key !== "Enter") {
      return;
    }
    debouncedSearchInput = searchInput;
    if (filtered.length > 0) {
      e.preventDefault();
      onSelected(filtered[0]);
      searchInput = "";
      debouncedSearchInput = "";
    }
  }}
/>
{#if popover || filtered.length > 0}
  <div
    bind:this={listEl}
    id="filtered-list-{id}"
    popover={popover ? "auto" : undefined}
    style={popover
      ? "position: fixed; overflow-y: scroll; height: 16rem; max-height: 16rem"
      : "overflow-y: scroll;"}
  >
    <ol class="picker-list">
      {#each filtered as row (key(row))}
        <li>
          <button
            onclick={(e) => {
              e.preventDefault();
              onSelected(row);
              searchInput = "";
              debouncedSearchInput = "";
            }}
          >
            {@render render(row)}
          </button>
        </li>
      {/each}
    </ol>
  </div>
{/if}
