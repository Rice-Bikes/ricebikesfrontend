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
  } from "$lib/api";
  import { appState } from "$lib/state.svelte";
  import Picker from "$lib/Picker.svelte";
  import EditInput from "$lib/EditInput.svelte";
  import ItemBuilder from "$lib/ItemBuilder.svelte";
  import RepairBuilder from "$lib/RepairBuilder.svelte";
  import StepList from "$lib/StepList.svelte";
  import CustomerSelector from "$lib/CustomerSelector.svelte";
  import { replace } from "svelte-spa-router";

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

  // TODO: add in tune up price by inlining tune up info in transaction details
  const totalPrice = $derived.by(() => {
    return (
      items.reduce((acc, detail) => acc + detail.item.standardPrice, 0) +
      repairs.reduce(
        (acc, detail) =>
          acc + (detail.tuneUpId === null ? detail.repair.price : 0),
        0,
      )
    );
  });

  const cannotAdvanceReasons = $derived.by<string[]>(() => {
    const reasons = [];
    if (!repairs.every((repair) => repair.completed)) {
      reasons.push("Repairs not completed");
    }
    if (transaction !== undefined && transaction.isWaitingOnEmail) {
      reasons.push("Waiting on email");
    }
    if (!steps.every((step) => step.completed)) {
      reasons.push("Steps not completed");
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
  <p>Loading...</p>
{:else}
  <h1>
    #{transaction.num}:
    {#if transaction.customer !== null}
      {transaction.customer.firstName}
      {transaction.customer.lastName}
    {:else}
      Unreserved
    {/if}
    <span>({transaction.transactionType})</span>
  </h1>
  <ul>
    <li><date>{new Date(transaction.dateCreated).toDateString()}</date></li>
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
              >{transaction!.customer!.phone}</a
            >
          {:else}
            None
          {/if}
        {/snippet}
        <EditInput
          initial={transaction.customer.phone || ""}
          type="tel"
          placeholder="Customer phone"
          callback={(phone) => updateCustomer({ phone })}
          preedit={renderPhone}
        />
      </li>
    {/if}
  </ul>
  <div>
    <span>Tags</span>
    <ul>
      {#each tags as tag}
        <li>
          <button onclick={() => removeTag(tag)}
            >{transactionTagToString(tag)}</button
          >
        </li>
      {/each}
    </ul>
    {#if tags.length < MAX_TAGS_LEN}
      <button popovertarget="tags-options">+</button>
      <ul id="tags-options" popover="auto">
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
    {/if}
  </div>
  {#if transaction.customer === null}
    <button
      onclick={() => customerSelectorKey++}
      command="show-modal"
      commandfor="customer-dialog">Reserve</button
    >
    <dialog id="customer-dialog">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          reserveForCustomer();
        }}
      >
        {#key customerSelectorKey}
          <CustomerSelector
            bind:customer={selectedCustomer}
            customers={allCustomers}
          />
        {/key}
        <button>Save</button>
      </form>
      <button commandfor="customer-dialog" command="close">Close</button>
    </dialog>
  {/if}
  <button onclick={deleteTransaction}>Delete</button>
  {#if transaction.bike}
    <section>
      <h2>Bike Info</h2>
      <div>
        <div>
          Make <EditInput
            initial={transaction.bike.make}
            callback={(make) => updateBike({ make })}
            placeholder="Enter bike make"
          />
        </div>
        <div>
          Model <EditInput
            initial={transaction.bike.model}
            callback={(model) => updateBike({ model })}
            placeholder="Enter bike model"
          />
        </div>
        <div>
          Description <EditInput
            initial={transaction.bike.description}
            callback={(description) => updateBike({ description })}
            placeholder="Enter bike description"
          />
        </div>
      </div>
    </section>
  {/if}
  <section style="width: 80ch">
    <h2>Logs</h2>
    <ol>
      {#each logs as line}
        <li>{line}</li>
      {/each}
    </ol>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        submitLogEntry();
      }}
    >
      <input placeholder="Enter log entry" bind:value={logEntry} />
      <button>Submit</button>
    </form>
  </section>
  <section>
    <h2>Parts & Repairs</h2>
    <div>
      <div>
        <ul>
          {#each items as detail, i (detail.id)}
            <li>
              Item: {detail.item.name} ${detail.item.standardPrice}<button
                onclick={() => deleteTransactionDetail(i, detail)}
                >Delete</button
              >
            </li>
          {/each}
        </ul>
      </div>
      <div>
        <ul>
          {#each repairs as detail, i (detail.id)}
            <li>
              {#if detail.completed}
                COMPLETED
              {/if}
              Repair: {detail.repair.name} ${detail.repair.price}<button
                popovertarget={`description-${detail.id}`}>Info</button
              ><button onclick={() => deleteTransactionDetail(i, detail)}
                >Delete</button
              ><button onclick={() => toggleRepairCompleted(i, detail)}
                >Complete</button
              >
              <p id={`description-${detail.id}`} popover>
                {detail.repair.description}
              </p>
            </li>
          {/each}
        </ul>
      </div>
    </div>
    <p>Total: ${totalPrice}</p>
    <button
      onclick={() => itemPickerKey++}
      command="show-modal"
      commandfor="item-dialog">Add part</button
    >
    <dialog id="item-dialog">
      {#snippet itemRender(item: Item)}
        {item.name} ${item.standardPrice}
      {/snippet}
      {#key itemPickerKey}
        <Picker
          data={allItems}
          key={(item) => item.id}
          searchKeys={["name"]}
          render={itemRender}
          callback={onItemPicked}
        />
      {/key}
      <button
        onclick={() => itemBuilderKey++}
        command="show-modal"
        commandfor="new-item-dialog">New</button
      >
      <button command="close" commandfor="item-dialog">Close</button>
    </dialog>
    <dialog id="new-item-dialog">
      {#key itemBuilderKey}
        <ItemBuilder callback={onItemBuilt} />
      {/key}
      <button command="close" commandfor="new-item-dialog">Cancel</button>
    </dialog>
    <button
      onclick={() => repairPickerKey++}
      command="show-modal"
      commandfor="repair-dialog">Add repair</button
    >
    <dialog id="repair-dialog">
      {#snippet repairRender(repair: Repair)}
        {repair.name} ${repair.price}
      {/snippet}
      {#key repairPickerKey}
        <Picker
          data={allRepairs}
          key={(repair) => repair.id}
          searchKeys={["name"]}
          render={repairRender}
          callback={onRepairPicked}
        />
      {/key}
      <button
        onclick={() => repairBuilderKey++}
        command="show-modal"
        commandfor="new-repair-dialog">New</button
      >
      <button commandfor="repair-dialog" command="close">Close</button>
    </dialog>
    <dialog id="new-repair-dialog">
      {#key repairBuilderKey}
        <RepairBuilder callback={onRepairBuilt} />
      {/key}
      <button command="close" commandfor="new-repair-dialog">Cancel</button>
    </dialog>
    <button command="show-modal" commandfor="tuneup-dialog">Add tune up</button>
    {#snippet tuneUpRender(tuneUp: TuneUp)}
      {tuneUp.name} ${tuneUp.cost}
    {/snippet}
    <dialog id="tuneup-dialog">
      {#key tuneUpPickerKey}
        <Picker
          data={tuneUps}
          key={(tuneUp) => tuneUp.id}
          searchKeys={["name"]}
          render={tuneUpRender}
          callback={onTuneUpPicked}
        />
      {/key}
      <button commandfor="tuneup-dialog" command="close">Close</button>
    </dialog>
  </section>
  <section>
    <h2>Steps</h2>
    <StepList bind:steps transaction={params.id} />
  </section>
  <section>
    <h2>Stage</h2>
    <button
      disabled={!transaction.isCompleted}
      onclick={() => deadvanceStage()}
    >
      &lt;
    </button>
    <span>
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
      onclick={() => advanceStage()}
      disabled={!canAdvance || transaction.isPaid}
    >
      &gt;
    </button>
    {#if !canAdvance}
      <ul>
        {#each cannotAdvanceReasons as reason}
          <li>{reason}</li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
