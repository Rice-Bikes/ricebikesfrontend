<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import ChevronLeft from "$lib/icons/ChevronLeft.svelte";
  import ChevronRight from "$lib/icons/ChevronRight.svelte";

  interface Column {
    name: string;
    render: Snippet<[T]>;
    width?: string;
  }
  interface Props {
    page?: number;
    data: T[];
    columns: Column[];
    key: (row: T) => any;
    pageLimit: number;
    comparator?: ((a: T, b: T) => number) | null;
  }

  let {
    page = $bindable(0),
    data,
    columns,
    key,
    pageLimit,
    comparator = null,
  }: Props = $props();

  let maxPage = $derived(Math.ceil(data.length / pageLimit) - 1);
  // Clamp page
  $effect(() => {
    page = Math.min(Math.max(page, 0), maxPage);
  });
  const rawRows = $derived.by(() => {
    const sorted = [...data];
    if (comparator) {
      sorted.sort(comparator);
    }
    return sorted.slice(page * pageLimit, page * pageLimit + pageLimit);
  });
</script>

<table>
  <colgroup>
    {#each columns as column}
      <col style={column.width ? `width: ${column.width}` : ""} />
    {/each}
  </colgroup>
  <thead>
    <tr>
      {#each columns as column}
        <th>{column.name}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each rawRows as rawData (key(rawData))}
      <tr>
        {#each columns as column}
          <td>{@render column.render(rawData)}</td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
<div class="table-pagination">
  <button
    class="icon-btn"
    aria-label="Previous page"
    disabled={page == 0}
    onclick={() => (page -= 1)}><ChevronLeft /></button
  >
  <span class="muted">{page + 1} / {Math.max(maxPage + 1, 1)}</span>
  <button
    class="icon-btn"
    aria-label="Next page"
    disabled={page == maxPage}
    onclick={() => (page += 1)}><ChevronRight /></button
  >
</div>
