<script lang="ts">
  import { rbFetch, orderRequestFromRaw, type OrderRequest } from "$lib/api";
  import X from "$lib/icons/X.svelte";
  import Check from "$lib/icons/Check.svelte";

  let orders = $state<OrderRequest[]>([]);
  $effect(() => {
    loadOrders();
  });
  async function loadOrders() {
    const rawOrders: any[] = await rbFetch("/orderRequests");
    orders = rawOrders.map(orderRequestFromRaw);
  }

  const groupsUnordered = $derived.by(() => {
    const byItemId = new Map<string, OrderGroup>();
    for (const order of orders) {
      if (order.ordered) {
        continue;
      }
      if (!byItemId.has(order.item.id)) {
        byItemId.set(order.item.id, []);
      }
      byItemId.get(order.item.id)!.push(order);
    }
    for (const group of byItemId.values()) {
      group.sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime());
    }
    return byItemId;
  });
  const groupsOrdered = $derived.by(() => {
    const byItemId = new Map<string, OrderGroup>();
    for (const order of orders) {
      if (!order.ordered) {
        continue;
      }
      if (!byItemId.has(order.item.id)) {
        byItemId.set(order.item.id, []);
      }
      byItemId.get(order.item.id)!.push(order);
    }
    for (const group of byItemId.values()) {
      group.sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime());
    }
    return byItemId;
  });

  async function setOrdered(itemId: string, i: number, yes: boolean) {
    let map;
    let other;
    if (!yes) {
      map = groupsOrdered;
      other = groupsUnordered;
    } else {
      map = groupsUnordered;
      other = groupsOrdered;
    }
    const order = map.get(itemId)![i];
    order.ordered = yes;
    map.get(itemId)!.splice(i, 1);
    if (map.get(itemId)!.length === 0) {
      map.delete(itemId);
    }
    if (!other.has(itemId)) {
      other.set(itemId, []);
    }
    other.get(itemId)!.push(order);
    other
      .get(itemId)
      .sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime());
    const r = await rbFetch(`/orderRequests/${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ordered: yes }),
    });
  }
</script>

<h1>Orders</h1>

<section>
  <h2>Unordered</h2>
  {#if groupsUnordered.size > 0}
    <ul class="entry-list">
      {#each groupsUnordered as [itemId, group] (itemId)}
        <li class="repair-group">
          <div class="repair-group-header">
            <span class="entry-label">{group[0].item.name}</span>
            <span class="muted">{group.length}</span>
          </div>
          <div>
            <div class="muted">
              UPC: {group[0].item.upc}
            </div>
            <div class="muted">
              Price: ${group[0].item.standardPrice}
            </div>
            <div class="muted">
              Wholesale Cost: ${group[0].item.wholesaleCost}
            </div>
          </div>
          <ol class="entry-list">
            {#each group as order, i (order.id)}
              <li style="max-width: min(50ch, 95%)" class="entry-row">
                <span class="entry-label">
                  <a href="#/transaction/{order.transaction.id}"
                    >#{order.transaction.num}</a
                  >
                  <span class="faint">
                    <date>{order.dateCreated.toDateString()}</date>
                    &mdash;
                    {order.createdBy.firstName}
                    {order.createdBy.lastName}
                  </span>
                </span>
                <span class="entry-actions">
                  <button
                    onclick={() => setOrdered(itemId, i, true)}
                    class="icon-btn success"
                    aria-label="Set ordered"><Check /></button
                  >
                </span>
              </li>
            {/each}
          </ol>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No unordered items</p>
  {/if}
</section>

<section>
  <h2>Ordered</h2>
  {#if groupsOrdered.size > 0}
    <ul class="entry-list">
      {#each groupsOrdered as [itemId, group] (itemId)}
        <li class="repair-group">
          <div class="repair-group-header">
            <span class="entry-label">{group[0].item.name}</span>
            <span class="muted">{group.length}</span>
          </div>
          <ol class="entry-list">
            {#each group as order, i (order.id)}
              <li style="max-width: min(50ch, 95%)" class="entry-row">
                <span class="entry-label">
                  <a href="#/transaction/{order.transaction.id}"
                    >#{order.transaction.num}</a
                  >
                  <span class="faint">
                    <date>{order.dateCreated.toDateString()}</date>
                    &mdash;
                    {order.createdBy.firstName}
                    {order.createdBy.lastName}
                  </span>
                </span>
                <span class="entry-actions">
                  <button
                    onclick={() => setOrdered(itemId, i, false)}
                    class="icon-btn"
                    aria-label="Set not ordered"><X /></button
                  >
                </span>
              </li>
            {/each}
          </ol>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No ordered items</p>
  {/if}
</section>
