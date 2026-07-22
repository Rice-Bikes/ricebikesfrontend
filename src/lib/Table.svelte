<script lang="ts" generics="T">
  import type { Snippet } from "svelte";

  interface Column {
    name: string;
    render: Snippet<[T]>;
  }
  interface Props {
    page: number;
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
<button disabled={page == 0} onclick={() => (page -= 1)}>Back</button>
<button disabled={page == maxPage} onclick={() => (page += 1)}>Forward</button>
