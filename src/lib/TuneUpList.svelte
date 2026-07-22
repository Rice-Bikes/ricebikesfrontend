<script lang="ts">
  import {
    rbFetch,
    tuneUpItemFromRaw,
    rawFromTuneUpItem,
    type TuneUp,
    type TuneUpItem,
    type Repair,
  } from "$lib/api";
  import Picker from "$lib/Picker.svelte";

  interface Props {
    items?: TuneUpItem[];
    tuneup: TuneUp;
    repairs: Repair[];
  }

  let { items = $bindable([]), tuneup, repairs }: Props = $props();

  $effect(() => {
    loadItems();
  });
  async function loadItems() {
    const urlParams = new URLSearchParams({ tune_up_id: tuneup.id });
    const raw: any[] = await rbFetch(`/tuneUpItems?${urlParams}`);
    items = raw.map(tuneUpItemFromRaw);
  }

  async function deleteItem(item: TuneUpItem, i: number) {
    await rbFetch(`/tuneUpItems/${item.id}`, { method: "DELETE" });
    items.splice(i, 1);
  }

  async function onRepairPicked(repair: Repair) {
    const rawItem = await rbFetch("/tuneUpItems", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repair_id: repair.id,
        tune_up_id: tuneup.id,
      }),
    });
    items.push(tuneUpItemFromRaw(rawItem));
  }
</script>

{#if items.length > 0}
  <ol>
    {#each items as item, i (item.id)}
      <li>
        {item.repair.name}
        <button onclick={() => deleteItem(item, i)}>Delete</button>
      </li>
    {/each}
  </ol>
{:else}
  <p>No items</p>
{/if}
{#snippet repairRender(repair: Repair)}
  {repair.name}
{/snippet}
<Picker
  data={repairs}
  key={(repair) => repair.id}
  searchKeys={["name"]}
  render={repairRender}
  callback={onRepairPicked}
/>
