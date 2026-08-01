<script lang="ts">
  import {
    rbFetch,
    rawFromTransaction,
    rawFromBike,
    rawFromCustomer,
    rawFromItem,
    rawFromRepair,
    rawFromStep,
    customerFromRaw,
    itemFromRaw,
    repairFromRaw,
    tuneUpFromRaw,
    transactionFromRaw,
    stepFromRaw,
    transactionDetailFromRaw,
    historyEntryFromRaw,
    orderRequestFromRaw,
    type Transaction,
    type Item,
    type Repair,
    type Bike,
    type Customer,
    type NewItem,
    type NewRepair,
    type Step,
    type TuneUp,
    type TransactionDetailItem,
    type TransactionDetailRepair,
    type TransactionDetail,
    type OrderRequest,
    type NewOrderRequest,
    type HistoryEntry,
  } from "$lib/api";
  import { appState } from "$lib/state.svelte";
  import Picker from "$lib/Picker.svelte";
  import EditInput from "$lib/EditInput.svelte";
  import ItemBuilder from "$lib/ItemBuilder.svelte";
  import RepairBuilder from "$lib/RepairBuilder.svelte";
  import StepList from "$lib/StepList.svelte";
  import CustomerSelector from "$lib/CustomerSelector.svelte";
  import { replace } from "svelte-spa-router";
  import { formatPhoneNumber, titleCase } from "$lib/format";
  import Trash from "$lib/icons/Trash.svelte";
  import Check from "$lib/icons/Check.svelte";
  import ArrowRight from "$lib/icons/ArrowRight.svelte";
  import ChevronLeft from "$lib/icons/ChevronLeft.svelte";
  import ChevronRight from "$lib/icons/ChevronRight.svelte";
  import Plus from "$lib/icons/Plus.svelte";
  import Info from "$lib/icons/Info.svelte";
  import X from "$lib/icons/X.svelte";
  import Clock from "$lib/icons/Clock.svelte";

  const { params } = $props();

  const logs = $state<string[]>([]);
  let transaction = $state<Transaction | undefined>(undefined);
  $effect(() => {
    loadTransaction();
  });
  async function loadTransaction() {
    const raw: any = await rbFetch(`/transactions/${params.id}`);
    transaction = transactionFromRaw(raw);
    // Parse transaction logs into something easier to work with
    let aggregate: string[] = [];
    for (const rawLine of transaction.description
      .split("\n")
      .filter((s) => s.trim().length > 0)) {
      const dashIndex = rawLine.lastIndexOf("-");
      if (rawLine.slice(0, dashIndex).trim().length == 0) {
        continue;
      }
      aggregate.push(rawLine);
      if (dashIndex === -1) {
        continue;
      }
      logs.push(aggregate.join("\n"));
      aggregate = [];
    }
    loadHistory();
  }

  // TODO: can lazy load this
  let allItems = $state<Item[]>([]);
  $effect(() => {
    loadItems();
  });
  async function loadItems() {
    const rawItems: any[] = await rbFetch("/items");
    allItems = rawItems.map(itemFromRaw);
  }

  // TODO: can lazy load this
  let allRepairs = $state<Repair[]>([]);
  $effect(() => {
    loadRepairs();
  });
  async function loadRepairs() {
    const rawRepairs: any[] = await rbFetch("/repairs");
    allRepairs = rawRepairs.map(repairFromRaw);
  }

  // TODO: can lazy load this
  let allCustomers = $state<Customer[]>([]);
  $effect(() => {
    loadCustomers();
  });
  async function loadCustomers() {
    const rawCustomers: any[] = await rbFetch("/customers");
    allCustomers = rawCustomers.map(customerFromRaw);
  }

  let steps = $state<Step[]>([]);

  // Incremented every time the item picker modal is opened
  let itemPickerKey = $state(0);
  // Incremented every time the repair picker modal is opened
  let repairPickerKey = $state(0);
  // Incremented every time the item builder modal is opened
  let itemBuilderKey = $state(0);
  // Incremented every time the repair builder modal is opened
  let repairBuilderKey = $state(0);

  let repairs = $state<TransactionDetailRepair[]>([]);
  let items = $state<TransactionDetailItem[]>([]);

  interface RepairGroup {
    tuneUpId: string | null;
    details: TransactionDetailRepair[];
  }
  const repairGroups = $derived.by<RepairGroup[]>(() => {
    const groups: RepairGroup[] = [];
    const byTuneUp = new Map<string, TransactionDetailRepair[]>();
    for (const detail of repairs) {
      if (detail.tuneUpId !== null) {
        if (!byTuneUp.has(detail.tuneUpId)) {
          byTuneUp.set(detail.tuneUpId, []);
        }
        byTuneUp.get(detail.tuneUpId)!.push(detail);
      } else {
        groups.push({ tuneUpId: null, details: [detail] });
      }
    }
    for (const [tuneUpId, details] of byTuneUp) {
      groups.push({ tuneUpId, details });
    }
    return groups;
  });

  function tuneUpName(tuneUpId: string): string {
    return tuneUps.find((t) => t.id === tuneUpId)?.name ?? "Tune up";
  }

  function tuneUpPrice(tuneUpId: string): number | null {
    return tuneUps.find((t) => t.id === tuneUpId)?.cost ?? null;
  }

  async function deleteRepairGroup(details: TransactionDetailRepair[]) {
    for (const detail of details) {
      const i = repairs.findIndex((r) => r.id === detail.id);
      if (i !== -1) {
        repairs.splice(i, 1);
      }
    }
    await Promise.all(
      details.map((detail) =>
        rbFetch(`/transactionDetails/${detail.id}`, { method: "DELETE" }),
      ),
    );
  }

  type TransactionTag = "beerBike" | "urgent" | "nuclear" | "email";
  const MAX_TAGS_LEN = 4;
  const tags = $derived.by<TransactionTag[]>(() => {
    if (transaction === undefined) {
      return [];
    }
    const l: TransactionTag[] = [];
    if (transaction.isBeerBike) {
      l.push("beerBike");
    }
    if (transaction.isUrgent) {
      l.push("urgent");
    }
    if (transaction.isNuclear) {
      l.push("nuclear");
    }
    if (transaction.isWaitingOnEmail) {
      l.push("email");
    }
    return l;
  });

  const totalPrice = $derived.by(() => {
    return (
      items.reduce((acc, detail) => acc + detail.item.standardPrice, 0) +
      repairs.reduce(
        (acc, detail) =>
          acc + (detail.tuneUpId === null ? detail.repair.price : 0),
        0,
      ) +
      repairGroups.reduce(
        (acc, group) => acc + (tuneUpPrice(group.tuneUpId!) ?? 0),
        0,
      )
    );
  });

  const cannotAdvanceReasons = $derived.by<string[]>(() => {
    const reasons = [];
    if (!repairs.every((repair) => repair.completed)) {
      const plural = repairs.length > 1 ? "Repairs" : "Repair";
      reasons.push(`${plural} not completed`);
    }
    if (transaction !== undefined && transaction.isWaitingOnEmail) {
      reasons.push("Waiting on email");
    }
    if (!steps.every((step) => step.completed)) {
      const plural = steps.length > 1 ? "Steps" : "Step";
      reasons.push(`${plural} not completed`);
    }
    if (orders.length > 0) {
      const plural = orders.length > 1 ? "Order requests" : "Order request";
      reasons.push(`${plural} not processed`);
    }
    return reasons;
  });
  const canAdvance = $derived(cannotAdvanceReasons.length == 0);
  // Make sure we can never have a stage mismatch, where we have uncompleted repairs yet the
  // transaction is marked as completed.
  $effect(() => {
    if (
      !canAdvance &&
      transaction !== undefined &&
      (transaction.isPaid || transaction.isCompleted)
    ) {
      resetStage();
    }
  });

  $effect(() => {
    loadTransactionDetails();
  });
  async function loadTransactionDetails() {
    const rawDetails: any[] = await rbFetch(`/transactionDetails/${params.id}`);
    const details = rawDetails.map(transactionDetailFromRaw);
    for (const detail of details) {
      if (detail.kind === "item") {
        items.push(detail);
      }
      if (detail.kind === "repair") {
        repairs.push(detail);
      }
    }
    items.sort((a, b) => a.item.name.localeCompare(b.item.name));
    repairs.sort((a, b) => a.repair.name.localeCompare(b.repair.name));
  }

  let tuneUps = $state<TuneUp[]>([]);
  $effect(() => {
    loadTuneUps();
  });
  async function loadTuneUps() {
    const rawTuneUps: any[] = await rbFetch("/tuneUps");
    tuneUps = rawTuneUps.map(tuneUpFromRaw);
  }
  let tuneUpPickerKey = $state(0);
  async function onTuneUpPicked(tuneUp: TuneUp) {
    const dialog = document.getElementById(
      "tuneup-dialog",
    ) as HTMLDialogElement;
    dialog.close();
    const rawDetails: any[] = await rbFetch(`/tuneUps/${tuneUp.id}/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_id: params.id,
        changed_by: appState.user!.id,
      }),
    });
    repairs.push(
      ...(rawDetails.map(
        transactionDetailFromRaw,
      ) as TransactionDetailRepair[]),
    );
    repairs.sort((a, b) => a.repair.name.localeCompare(b.repair.name));
  }

  function splitLogEntry(line: string): {
    message: string;
    author: string | null;
  } {
    const entryLines = line.split("\n");
    const last = entryLines[entryLines.length - 1];
    const dashIndex = last.lastIndexOf("-");
    if (dashIndex === -1) {
      return { message: line, author: null };
    }
    const author = last.slice(dashIndex + 1).trim();
    const messageLast = last.slice(0, dashIndex).trim();
    const messageLines = [...entryLines.slice(0, -1), messageLast];
    return { message: messageLines.join("\n"), author };
  }

  let logEntry = $state("");
  async function submitLogEntry() {
    const trimmed = logEntry.trim();
    if (trimmed.length === 0) {
      return;
    }
    const lineEntry = `${logEntry} - ${appState.user!.firstName} ${appState.user!.lastName}`;
    logs.push(lineEntry);
    await updateTransaction({
      description: logs.join("\n"),
    });
    logEntry = "";
  }

  let history = $state<HistoryEntry[]>([]);
  async function loadHistory() {
    const rawHistory: any[] = await rbFetch(
      `/transactionLogs/${transaction!.num}`,
    );
    history = rawHistory.map(historyEntryFromRaw);
  }

  async function deleteTransaction() {
    await rbFetch(`/transactions/${params.id}`, { method: "DELETE" });
    replace("/");
  }

  let customerSelectorKey = $state(0);
  let selectedCustomer = $state<Customer | null>(null);
  async function reserveForCustomer() {
    const dialog = document.getElementById(
      "customer-dialog",
    ) as HTMLDialogElement;
    dialog.close();
    if (selectedCustomer === null) {
      return;
    }
    await updateTransaction({ customer: selectedCustomer });
  }
  async function unreserve() {
    await updateTransaction({ customer: null });
  }

  async function deleteTransactionDetail(i: number, detail: TransactionDetail) {
    if (detail.kind === "item") {
      items.splice(i, 1);
    }
    if (detail.kind === "repair") {
      repairs.splice(i, 1);
    }
    await rbFetch(`/transactionDetails/${detail.id}`, { method: "DELETE" });
  }

  async function toggleRepairCompleted(
    i: number,
    detail: TransactionDetailRepair,
  ) {
    repairs[i].completed = !detail.completed;
    await rbFetch(`/transactionDetails/${detail.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completed: !detail.completed,
      }),
    });
  }

  let orders = $state<OrderRequest[]>([]);
  $effect(() => {
    loadOrders();
  });
  async function loadOrders() {
    const rawOrders: any[] = await rbFetch(`/orderRequests/${params.id}`);
    orders = rawOrders.map(orderRequestFromRaw);
    orders.sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime());
  }

  async function requestPart(i: number, detail: TransactionDetailItem) {
    items.splice(i, 1);
    deleteTransactionDetail(i, detail);
    const rawOrder = await rbFetch("/orderRequests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        created_by: appState.user!.id,
        notes: "",
        quantity: 1,
        transaction_id: params.id,
        item_id: detail.item.id,
      }),
    });
    orders.push(orderRequestFromRaw(rawOrder));
    orders.sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime());
  }
  async function deleteOrder(i: number, order: OrderRequest) {
    orders.splice(i, 1);
    await rbFetch(`/orderRequests/${order.id}`, { method: "DELETE" });
  }
  async function finishOrder(i: number, order: OrderRequest) {
    deleteOrder(i, order);
    onItemPicked(order.item);
  }

  async function onItemPicked(item: Item) {
    const dialog = document.getElementById("item-dialog") as HTMLDialogElement;
    dialog.close();
    const rawDetail: any = await rbFetch(`/transactionDetails/${params.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_id: item.id,
        repair_id: null,
        changed_by: appState.user!.id,
        quantity: 1,
      }),
    });
    items.push(transactionDetailFromRaw(rawDetail) as TransactionDetailItem);
    items.sort((a, b) => a.item.name.localeCompare(b.item.name));
  }

  async function onRepairPicked(repair: Repair) {
    const dialog = document.getElementById(
      "repair-dialog",
    ) as HTMLDialogElement;
    dialog.close();
    const rawDetail: any = await rbFetch(`/transactionDetails/${params.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_id: null,
        repair_id: repair.id,
        changed_by: appState.user!.id,
        quantity: 1,
      }),
    });
    repairs.push(
      transactionDetailFromRaw(rawDetail) as TransactionDetailRepair,
    );
    repairs.sort((a, b) => a.repair.name.localeCompare(b.repair.name));
  }

  async function onItemBuilt(item: NewItem) {
    const newItemDialog = document.getElementById(
      "new-item-dialog",
    ) as HTMLDialogElement;
    const itemDialog = document.getElementById(
      "item-dialog",
    ) as HTMLDialogElement;
    newItemDialog.close();
    itemDialog.close();
    const rawItem: any = await rbFetch("/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromItem(item)),
    });
    const itemWithId = {
      id: rawItem.item_id,
      ...item,
    };
    allItems.push(itemWithId);
    await onItemPicked(itemWithId);
  }

  async function onRepairBuilt(repair: NewRepair) {
    const newRepairDialog = document.getElementById(
      "new-repair-dialog",
    ) as HTMLDialogElement;
    const repairDialog = document.getElementById(
      "repair-dialog",
    ) as HTMLDialogElement;
    newRepairDialog.close();
    repairDialog.close();
    const rawRepair: any = await rbFetch("/repairs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromRepair(repair)),
    });
    const repairWithId = {
      id: rawRepair.repair_id,
      ...repair,
    };
    allRepairs.push(repairWithId);
    await onRepairPicked(repairWithId);
  }

  /// Returns true if object was written to.
  function updateObject<T extends object>(
    obj: T,
    newData: Partial<T>,
  ): boolean {
    let changed = false;
    for (const key of Object.keys(newData) as (keyof T)[]) {
      if (obj[key] !== newData[key]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      Object.assign(obj, newData);
    }
    return changed;
  }

  async function updateTransaction(body: Partial<Transaction>) {
    const didUpdate = updateObject(transaction!, body);
    if (!didUpdate) {
      return;
    }
    return rbFetch(`/transactions/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromTransaction(body)),
    });
  }

  async function changeTagValue(tag: TransactionTag, on: boolean) {
    switch (tag) {
      case "urgent":
        await updateTransaction({ isUrgent: on });
        break;
      case "beerBike":
        await updateTransaction({ isBeerBike: on });
        break;
      case "nuclear":
        await updateTransaction({ isNuclear: on });
        break;
      case "email":
        await updateTransaction({ isWaitingOnEmail: on });
        break;
    }
  }

  async function addTag(tag: TransactionTag) {
    changeTagValue(tag, true);
  }

  async function removeTag(tag: TransactionTag) {
    changeTagValue(tag, false);
  }

  function transactionTagToString(tag: TransactionTag): string {
    switch (tag) {
      case "urgent":
        return "Urgent";
      case "beerBike":
        return "Beer bike";
      case "nuclear":
        return "Nuclear";
      case "email":
        return "Waiting on email";
    }
  }

  async function advanceStage() {
    if (!transaction!.isCompleted) {
      await updateTransaction({ isCompleted: true });
      return;
    }
    if (!transaction!.isPaid) {
      await updateTransaction({ isPaid: true });
      return;
    }
  }

  async function deadvanceStage() {
    if (transaction!.isPaid) {
      await updateTransaction({ isPaid: false });
      return;
    }
    if (transaction!.isCompleted) {
      await updateTransaction({ isCompleted: false });
      return;
    }
  }

  async function resetStage() {
    await updateTransaction({ isPaid: false, isCompleted: false });
  }

  async function updateBike(body: Partial<Bike>) {
    const didUpdate = updateObject(transaction!.bike!, body);
    if (!didUpdate) {
      return;
    }
    return rbFetch(`/bikes/${transaction!.bike!.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromBike(body)),
    });
  }

  async function updateCustomer(body: Partial<Customer>) {
    const didUpdate = updateObject(transaction!.customer!, body);
    if (!didUpdate) {
      return;
    }
    return rbFetch(`/customers/${transaction!.customer!.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromCustomer(body)),
    });
  }
</script>

{#if transaction === undefined}
  <p class="muted">Loading...</p>
{:else}
  <div class="field-row">
    <div class="horizontal-align">
      <h1>
        #{transaction.num}:
        {#if transaction.customer !== null}
          {transaction.customer.firstName}
          {transaction.customer.lastName}
        {:else}
          Unreserved
        {/if}
        <span class="muted">({titleCase(transaction.transactionType)})</span>
      </h1>
      <button
        class="icon-btn danger"
        aria-label="Delete transaction"
        onclick={deleteTransaction}><Trash /></button
      >
    </div>
  </div>
  <ul class="tag-list" style="margin-top: var(--space-2)">
    <li class="faint">
      <date>{new Date(transaction.dateCreated).toDateString()}</date>
    </li>
    {#if transaction.customer !== null}
      <li>
        {#snippet renderEmail()}
          <a href={`mailto:${transaction!.customer!.email}`}
            >{transaction!.customer!.email}</a
          >
        {/snippet}
        <EditInput
          initial={transaction.customer.email}
          type="email"
          placeholder="Customer email"
          callback={(email) => updateCustomer({ email })}
          preedit={renderEmail}
        />
      </li>
      <li>
        {#snippet renderPhone()}
          {#if transaction!.customer!.phone}
            <a href={`tel:+${transaction!.customer!.phone}`}
              >{formatPhoneNumber(transaction!.customer!.phone)}</a
            >
          {:else}
            <span class="muted">None</span>
          {/if}
        {/snippet}
        <EditInput
          initial={transaction.customer.phone || ""}
          type="tel"
          placeholder="Customer phone"
          callback={(phone) => updateCustomer({ phone })}
          preedit={renderPhone}
          formatter={formatPhoneNumber}
        />
      </li>
    {/if}
  </ul>
  <button
    style="margin-top: var(--space-3)"
    class="primary"
    command="show-modal"
    commandfor="history-dialog">History</button
  >
  <div class="field-row" style="margin-top: var(--space-3)">
    <span class="muted">Tags</span>
    <ul class="tag-list">
      {#each tags as tag}
        <li class="tag">
          {transactionTagToString(tag)}
          <button
            class="icon-btn"
            aria-label={`Remove ${transactionTagToString(tag)} tag`}
            onclick={() => removeTag(tag)}><X /></button
          >
        </li>
      {/each}
    </ul>
    {#if tags.length < MAX_TAGS_LEN}
      <button
        id="tags-add-btn"
        class="icon-btn"
        aria-label="Add tag"
        style="anchor-name: --tags-anchor"
        popovertarget="tags-options"><Plus /></button
      >
      <div
        id="tags-options"
        popover="auto"
        style="position-anchor: --tags-anchor"
      >
        <ul style="height: inherit" class="picker-list">
          {#each ["urgent", "beerBike", "nuclear", "email"] as tag}
            {#if !tags.includes(tag as TransactionTag)}
              <li>
                <button onclick={() => addTag(tag as TransactionTag)}
                  >{transactionTagToString(tag as TransactionTag)}</button
                >
              </li>
            {/if}
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  <dialog id="history-dialog" style="height: 30rem;">
    <div style="display: flex; flex-direction: column; height: 100%">
      <div class="dialog-header" style="flex-shrink: 0;">
        <h2>History</h2>
        <button
          class="icon-btn dialog-close"
          command="close"
          commandfor="history-dialog"
          aria-label="Close"><X /></button
        >
      </div>
      <ol class="log-list" style="flex: 1; min-height: 0; overflow-y: scroll">
        {#each history as entry}
          <li class="log-entry">{entry.description}</li>
        {/each}
      </ol>
    </div>
  </dialog>
  {#if transaction.customer === null}
    <button
      class="primary"
      style="margin-top: var(--space-3)"
      onclick={() => customerSelectorKey++}
      command="show-modal"
      commandfor="customer-dialog">Reserve</button
    >
    <dialog id="customer-dialog" style="height: 30rem">
      <div style="display: flex; flex-direction: column; height: 100%">
        <div class="dialog-header">
          <h2>Reserve transaction</h2>
          <button
            class="icon-btn dialog-close"
            command="close"
            commandfor="customer-dialog"
            aria-label="Close"><X /></button
          >
        </div>
        <form
          style="flex: 1; min-height: 0"
          onsubmit={(e) => {
            e.preventDefault();
            reserveForCustomer();
          }}
        >
          <div style="display: flex; flex-direction: column; height: 100%">
            {#key customerSelectorKey}
              <CustomerSelector
                bind:customer={selectedCustomer}
                customers={allCustomers}
              />
            {/key}
            <div style="flex: 1; min-height: 0"></div>
            <button class="primary">Save</button>
          </div>
        </form>
      </div>
    </dialog>
  {/if}
  {#if transaction.customer !== null && transaction.transactionType === "retrospec"}
    <button
      style="margin-top: var(--space-3)"
      class="primary"
      onclick={() => unreserve()}>Unreserve</button
    >
  {/if}
  {#if transaction.bike}
    <section>
      <h2>Bike Info</h2>
      <div style="display: flex; flex-direction: column; gap: var(--space-2)">
        <div class="field-row">
          <span class="muted">Make</span>
          <EditInput
            initial={transaction.bike.make}
            callback={(make) => updateBike({ make })}
            placeholder="Enter bike make"
          />
        </div>
        <div class="field-row">
          <span class="muted">Model</span>
          <EditInput
            initial={transaction.bike.model}
            callback={(model) => updateBike({ model })}
            placeholder="Enter bike model"
          />
        </div>
        <div class="field-row">
          <span class="muted">Description</span>
          <EditInput
            initial={transaction.bike.description}
            callback={(description) => updateBike({ description })}
            placeholder="Enter bike description"
          />
        </div>
      </div>
    </section>
  {/if}
  <section>
    <h2>Logs</h2>
    <div style="max-width: 80ch; text-wrap: pretty">
      <ol class="log-list">
        {#each logs as line}
          {@const parsed = splitLogEntry(line)}
          <li class="log-entry">
            <span class="log-message">{parsed.message}</span>
            {#if parsed.author}
              <span class="log-meta">{parsed.author}</span>
            {/if}
          </li>
        {/each}
      </ol>
      <form
        class="field-row"
        style="margin-top: var(--space-3)"
        onsubmit={(e) => {
          e.preventDefault();
          submitLogEntry();
        }}
      >
        <input
          style="flex: 1"
          placeholder="Enter log entry"
          bind:value={logEntry}
        />
        <button class="icon-btn primary" aria-label="Submit log entry"
          ><ArrowRight /></button
        >
      </form>
    </div>
  </section>
  <section>
    <h2>Parts &amp; Repairs</h2>
    <div class="parts-repairs-grid">
      <div class="column">
        <div class="column-header"><h3>Parts</h3></div>
        {#if items.length > 0}
          <ul class="entry-list">
            {#each items as detail, i (detail.id)}
              <li style="width: 100%" class="entry-row">
                <span style="text-wrap: wrap" class="entry-label"
                  >{detail.item.name} &mdash; ${detail.item.standardPrice}</span
                >
                <span class="entry-actions">
                  <button
                    class="icon-btn"
                    aria-label="Request part"
                    onclick={() => requestPart(i, detail)}><Clock /></button
                  >
                  <button
                    class="icon-btn danger"
                    aria-label="Delete part"
                    onclick={() => deleteTransactionDetail(i, detail)}
                    ><Trash /></button
                  >
                </span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted">No parts added</p>
        {/if}
        {#if orders.length > 0}
          <div style="margin-top: var(--space-3)" class="column-header">
            <h3>Orders</h3>
          </div>
          <ul class="entry-list">
            {#each orders as order, i (order.id)}
              <li
                style={"width: 100%;" +
                  (!order.ordered
                    ? "background: var(--color-warning-soft); border: 1px solid var(--color-warning)"
                    : "")}
                class="entry-row"
              >
                <span style="text-wrap: wrap" class="entry-label"
                  >{order.item.name} &mdash; ${order.item.standardPrice}</span
                >
                <span class="entry-actions">
                  {#if order.ordered}
                    <button
                      class="icon-btn success"
                      aria-label="Finish order request"
                      onclick={() => finishOrder(i, order)}><Check /></button
                    >
                  {/if}
                  <button
                    class="icon-btn danger"
                    aria-label="Delete order"
                    onclick={() => deleteOrder(i, order)}><Trash /></button
                  >
                </span>
              </li>
            {/each}
          </ul>
        {/if}
        <button
          class="primary"
          style="margin-top: var(--space-3)"
          onclick={() => itemPickerKey++}
          command="show-modal"
          commandfor="item-dialog"><Plus /> Add part</button
        >
        <dialog id="item-dialog" style="height: 25rem">
          <div style="display: flex; flex-direction: column; height: 100%;">
            <div class="dialog-header">
              <h2>Add part</h2>
              <button
                class="icon-btn dialog-close"
                command="close"
                commandfor="item-dialog"
                aria-label="Close"><X /></button
              >
            </div>
            {#snippet itemRender(item: Item)}
              {item.name} &mdash; ${item.standardPrice}
            {/snippet}
            {#key itemPickerKey}
              <Picker
                data={allItems}
                key={(item) => item.id}
                searchKeys={["name"]}
                render={itemRender}
                callback={onItemPicked}
                placeholder="Search parts"
              />
            {/key}
            <div style="flex: 1; min-height: 0"></div>
            <div class="dialog-actions">
              <button
                onclick={() => itemBuilderKey++}
                command="show-modal"
                commandfor="new-item-dialog"><Plus /> New part</button
              >
            </div>
          </div>
        </dialog>
        <dialog id="new-item-dialog">
          <div class="dialog-header">
            <h2>New part</h2>
            <button
              class="icon-btn dialog-close"
              command="close"
              commandfor="new-item-dialog"
              aria-label="Close"><X /></button
            >
          </div>
          {#key itemBuilderKey}
            <ItemBuilder callback={onItemBuilt} />
          {/key}
        </dialog>
      </div>
      <div class="column">
        <div class="column-header"><h3>Repairs</h3></div>
        {#if repairGroups.length > 0}
          <ul class="entry-list">
            {#each repairGroups as group (group.tuneUpId ?? group.details[0].id)}
              {#if group.tuneUpId !== null}
                <li style="width: 100%" class="repair-group">
                  <div class="repair-group-header">
                    <span class="entry-label"
                      >Tune up: {tuneUpName(group.tuneUpId)}</span
                    >
                    <button
                      class="icon-btn danger"
                      aria-label="Delete tune up group"
                      onclick={() => deleteRepairGroup(group.details)}
                      ><Trash /></button
                    >
                  </div>
                  <ul class="entry-list">
                    {#each group.details as detail (detail.id)}
                      <li
                        style="width: 100%"
                        class="entry-row"
                        class:completed={detail.completed}
                      >
                        <span style="text-wrap: wrap" class="entry-label"
                          >{detail.repair.name} &mdash; ${detail.repair
                            .price}</span
                        >
                        <span class="entry-actions">
                          <button
                            class="icon-btn"
                            style="anchor-name: {`--info-${detail.id}`}"
                            popovertarget={`description-${detail.id}`}
                            aria-label="Repair details"><Info /></button
                          >
                          <button
                            class="icon-btn success"
                            class:active={detail.completed}
                            aria-label={detail.completed
                              ? "Mark repair incomplete"
                              : "Mark repair complete"}
                            onclick={() =>
                              toggleRepairCompleted(
                                repairs.indexOf(detail),
                                detail,
                              )}><Check /></button
                          >
                        </span>
                        <p
                          id={`description-${detail.id}`}
                          popover
                          style="position-anchor: {`--info-${detail.id}`}; max-width: 45ch"
                        >
                          {detail.repair.description}
                        </p>
                      </li>
                    {/each}
                  </ul>
                </li>
              {:else}
                {@const detail = group.details[0]}
                <li
                  style="width: 100%"
                  class="entry-row"
                  class:completed={detail.completed}
                >
                  <span style="text-wrap: wrap" class="entry-label"
                    >{detail.repair.name} &mdash; ${detail.repair.price}</span
                  >
                  <span class="entry-actions">
                    <button
                      class="icon-btn"
                      style="anchor-name: {`--info-${detail.id}`}"
                      popovertarget={`description-${detail.id}`}
                      aria-label="Repair details"><Info /></button
                    >
                    <button
                      class="icon-btn success"
                      class:active={detail.completed}
                      aria-label={detail.completed
                        ? "Mark repair incomplete"
                        : "Mark repair complete"}
                      onclick={() =>
                        toggleRepairCompleted(repairs.indexOf(detail), detail)}
                      ><Check /></button
                    >
                    <button
                      class="icon-btn danger"
                      aria-label="Delete repair"
                      onclick={() =>
                        deleteTransactionDetail(
                          repairs.indexOf(detail),
                          detail,
                        )}><Trash /></button
                    >
                  </span>
                  <p
                    id={`description-${detail.id}`}
                    popover
                    style="position-anchor: {`--info-${detail.id}`}; max-width: 45ch"
                  >
                    {detail.repair.description}
                  </p>
                </li>
              {/if}
            {/each}
          </ul>
        {:else}
          <p class="muted">No repairs added</p>
        {/if}
        <div class="field-row" style="margin-top: var(--space-3)">
          <button
            class="primary"
            onclick={() => repairPickerKey++}
            command="show-modal"
            commandfor="repair-dialog"><Plus /> Add repair</button
          >
          <button
            command="show-modal"
            onclick={() => tuneUpPickerKey++}
            commandfor="tuneup-dialog"><Plus /> Add tune up</button
          >
        </div>
        <dialog id="repair-dialog" style="height: 25rem">
          <div style="display: flex; flex-direction: column; height: 100%;">
            <div class="dialog-header">
              <h2>Add repair</h2>
              <button
                class="icon-btn dialog-close"
                command="close"
                commandfor="repair-dialog"
                aria-label="Close"><X /></button
              >
            </div>
            {#snippet repairRender(repair: Repair)}
              {repair.name} &mdash; ${repair.price}
            {/snippet}
            {#key repairPickerKey}
              <Picker
                data={allRepairs}
                key={(repair) => repair.id}
                searchKeys={["name"]}
                render={repairRender}
                callback={onRepairPicked}
                placeholder="Search repairs"
              />
            {/key}
            <div style="flex: 1; min-height: 0"></div>
            <div class="dialog-actions">
              <button
                onclick={() => repairBuilderKey++}
                command="show-modal"
                commandfor="new-repair-dialog"><Plus /> New repair</button
              >
            </div>
          </div>
        </dialog>
        <dialog id="new-repair-dialog">
          <div class="dialog-header">
            <h2>New repair</h2>
            <button
              class="icon-btn dialog-close"
              command="close"
              commandfor="new-repair-dialog"
              aria-label="Close"><X /></button
            >
          </div>
          {#key repairBuilderKey}
            <RepairBuilder callback={onRepairBuilt} />
          {/key}
        </dialog>
        {#snippet tuneUpRender(tuneUp: TuneUp)}
          {tuneUp.name} &mdash; ${tuneUp.cost}
        {/snippet}
        <dialog id="tuneup-dialog" style="height: 25rem">
          <div style="display: flex; flex-direction: column; height: 100%;">
            <div class="dialog-header">
              <h2>Add tune up</h2>
              <button
                class="icon-btn dialog-close"
                command="close"
                commandfor="tuneup-dialog"
                aria-label="Close"><X /></button
              >
            </div>
            {#key tuneUpPickerKey}
              <Picker
                data={tuneUps}
                key={(tuneUp) => tuneUp.id}
                searchKeys={["name"]}
                render={tuneUpRender}
                callback={onTuneUpPicked}
                placeholder="Search tune ups"
              />
            {/key}
            <div style="flex: 1; min-height: 0"></div>
          </div>
        </dialog>
      </div>
    </div>
    <p style="margin-top: var(--space-4); font-weight: 600">
      Total: ${totalPrice}
    </p>
  </section>
  <section>
    <h2>Steps</h2>
    <StepList bind:steps transaction={params.id} />
  </section>
  <section>
    <h2>Stage</h2>
    <div class="stage-control">
      <button
        class="icon-btn"
        aria-label="Move to previous stage"
        disabled={!transaction.isCompleted}
        onclick={() => deadvanceStage()}
      >
        <ChevronLeft />
      </button>
      <span class="stage-label">
        {#if transaction.isCompleted}
          {#if transaction.isPaid}
            Paid
          {:else}
            Complete
          {/if}
        {:else}
          Not completed
        {/if}
      </span>
      <button
        class="icon-btn"
        aria-label="Advance stage"
        onclick={() => advanceStage()}
        disabled={!canAdvance || transaction.isPaid}
      >
        <ChevronRight />
      </button>
    </div>
    {#if !canAdvance}
      <ul style="margin-top: var(--space-2)">
        {#each cannotAdvanceReasons as reason}
          <li class="faint">{reason}</li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
