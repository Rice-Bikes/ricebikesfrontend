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
  import Info from "$lib/icons/Info.svelte";
  import Trash from "$lib/icons/Trash.svelte";

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

<div
  style="display: flex; flex-direction: column; gap: var(--space-2); max-width: 50ch"
>
  {#if items.length > 0}
    <ul class="entry-list">
      {#each items as item, i (item.id)}
        <li class="entry-row">
          <span class="entry-label">{item.repair.name}</span>
          <span class="entry-actions">
            <button
              class="icon-btn"
              style="anchor-name: {`--info-${tuneup.id}-${item.id}`}"
              popovertarget={`description-${tuneup.id}-${item.id}`}
              aria-label="Repair details"><Info /></button
            >
            <button
              class="icon-btn danger"
              aria-label="Delete item"
              onclick={() => deleteItem(item, i)}><Trash /></button
            >
          </span>
          <p
            id={`description-${tuneup.id}-${item.id}`}
            popover
            style="position-anchor: {`--info-${tuneup.id}-${item.id}`}; max-width: 45ch"
          >
            {item.repair.description}
          </p>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No items</p>
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
    placeholder="Enter repair"
    popover
  />
</div>
