<script lang="ts">
  import {
    rbFetch,
    transactionFromRaw,
    customerFromRaw,
    stepBundleFromRaw,
    tuneUpFromRaw,
    rawFromCustomer,
    rawFromBike,
    type Transaction,
    type NewTransaction,
    type Customer,
    type StepBundle,
    type TuneUp,
  } from "$lib/api";
  import { titleCase } from "$lib/format";
  import Table from "$lib/Table.svelte";
  import TransactionBuilder from "$lib/TransactionBuilder.svelte";
  import Plus from "$lib/icons/Plus.svelte";
  import X from "$lib/icons/X.svelte";
  import BeerIcon from "$lib/icons/Beer.svelte";
  import NuclearIcon from "$lib/icons/Nuclear.svelte";
  import EmployeeIcon from "$lib/icons/Person.svelte";
  import UrgentIcon from "$lib/icons/Exclamation.svelte";
  import EmailIcon from "$lib/icons/Email.svelte";
  import { push, replace, router } from "svelte-spa-router";

  let view = $state<"main" | "beerBikes" | "builds">("main");
  const viewFilter: (transaction: Transaction) => boolean = $derived.by(() => {
    switch (view) {
      case "main":
        return (transaction) =>
          (transaction?.isCompleted === false &&
            transaction.transactionType !== null &&
            transaction.transactionType !== "retrospec" &&
            (transaction?.isEmployee === false ||
              (transaction?.isEmployee === true &&
                transaction?.isBeerBike === true)) &&
            transaction?.isRefurb === false) ||
          (transaction.transactionType === "retrospec" &&
            transaction?.isRefurb === true &&
            !transaction?.isCompleted &&
            !transaction?.isWaitingOnEmail);
      case "beerBikes":
        return (x) =>
          x.isCompleted === false &&
          x.transactionType !== null &&
          x.dateCompleted === null &&
          x.transactionType !== "retrospec" &&
          x.isBeerBike;
      case "builds":
        return (x) => true;
    }
  });

  const transactionsPromise = $derived.by(async () => {
    const params = new URLSearchParams({
      page_limit: "1000",
      aggregate: "true",
    });
    const transactions: any[] = await rbFetch(`/transactions?${params}`);
    return transactions.map(transactionFromRaw);
  });
  const filteredTransactions: Promise<Transaction[]> = $derived.by(async () => {
    const fn = viewFilter;
    const transactions = await transactionsPromise;
    return transactions.filter(fn);
  });

  let transactionTablePage = $derived.by(() => {
    const params = new URLSearchParams(router.querystring ?? "");
    const page = params.get("page");
    return parseInt(page || "0") || 0;
  });

  // Change URL based on Transaction table page
  $effect(() => {
    const params = new URLSearchParams({
      page: transactionTablePage.toString(),
    });
    replace(`${router.location}?${params.toString()}`);
  });

  // Incremented when the transaction builder modal is opened
  let transactionBuilderKey = $state(0);

  // TODO: can lazy load this
  let allCustomers = $state<Customer[]>([]);
  $effect(() => {
    loadCustomers();
  });
  async function loadCustomers() {
    const rawCustomers: any[] = await rbFetch("/customers");
    allCustomers = rawCustomers.map(customerFromRaw);
  }

  let bundles = $state<StepBundle[]>([]);
  $effect(() => {
    loadBundles();
  });
  async function loadBundles() {
    const rawBundles: any[] = await rbFetch("/stepBundles");
    bundles = rawBundles.map(stepBundleFromRaw);
  }
  let tuneUps = $state<TuneUp[]>([]);
  $effect(() => {
    loadTuneUps();
  });
  async function loadTuneUps() {
    const rawTuneUps: any[] = await rbFetch("/tuneUps");
    tuneUps = rawTuneUps.map(tuneUpFromRaw);
  }

  async function onTransactionBuilt(transaction: NewTransaction) {
    const dialog = document.getElementById(
      "transaction-dialog",
    ) as HTMLDialogElement;
    dialog.close();
    let customerId = transaction.customer?.id;
    const bike: any | null =
      transaction.bike !== null
        ? await rbFetch("/bikes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(rawFromBike(transaction.bike)),
          })
        : null;
    const r: any = await rbFetch("/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_type: transaction.transactionType,
        customer_id: customerId ?? null,
        bike_id: bike?.bike_id,
        step_bundle_id: transaction.stepBundle?.id ?? undefined,
        tune_up_id: transaction.tuneUp?.id ?? undefined,
      }),
    });
    push(`/transaction/${r.transaction_id}`);
  }
</script>

{#snippet transactionNumColumn(transaction: Transaction)}
  <a href={`#/transaction/${transaction.id}`}>{transaction.num}</a>
{/snippet}
{#snippet transactionName(transaction: Transaction)}
  <span>{transaction.customer?.firstName} {transaction.customer?.lastName}</span
  >
{/snippet}
{#snippet transactionType(transaction: Transaction)}
  <span>{titleCase(transaction.transactionType)}</span>
{/snippet}
{#snippet transactionCreated(transaction: Transaction)}
  <date>{transaction.dateCreated.toDateString()}</date>
{/snippet}
{#snippet transactionBike(transaction: Transaction)}
  <span>{transaction.bike?.make} {transaction.bike?.model}</span>
{/snippet}
{#snippet transactionTagsColumn(transaction: Transaction)}
  <ul class="tag-icon-list">
    {#if transaction.isUrgent}
      <li><UrgentIcon /></li>
    {/if}
    {#if transaction.isBeerBike}
      <li><BeerIcon /></li>
    {/if}
    {#if transaction.isEmployee}
      <li><EmployeeIcon /></li>
    {/if}
    {#if transaction.isNuclear}
      <li><NuclearIcon /></li>
    {/if}
    {#if transaction.isWaitingOnEmail}
      <li><EmailIcon /></li>
    {/if}
  </ul>
{/snippet}

<h1>Transactions</h1>

{#await filteredTransactions}
  <p class="muted">Loading...</p>
{:then transactions: Transaction[]}
  <div class="field-row" style="margin-bottom: var(--space-4)">
    <select bind:value={view}>
      <option value="main">Main</option>
      <option value="builds">Builds</option>
      <option value="beerBikes">Beer bikes</option>
    </select>
    <button
      class="primary"
      onclick={() => transactionBuilderKey++}
      command="show-modal"
      commandfor="transaction-dialog"><Plus /> New</button
    >
    <span class="spacer" style="flex: 1"></span>
    <span class="muted">{transactions.length} transactions</span>
  </div>
  <dialog id="transaction-dialog">
    <div class="dialog-header">
      <h2>New transaction</h2>
      <button
        class="icon-btn dialog-close"
        command="close"
        commandfor="transaction-dialog"
        aria-label="Close"><X /></button
      >
    </div>
    {#key transactionBuilderKey}
      <TransactionBuilder
        customers={allCustomers}
        tuneups={tuneUps}
        {bundles}
        callback={onTransactionBuilt}
      />
    {/key}
  </dialog>
  <Table
    bind:page={transactionTablePage}
    data={transactions}
    pageLimit={20}
    key={(transaction) => transaction.id}
    comparator={(a, b) => b.dateCreated.getTime() - a.dateCreated.getTime()}
    columns={[
      {
        name: "#",
        render: transactionNumColumn,
        width: "8ch",
      },
      {
        name: "Tags",
        render: transactionTagsColumn,
        width: "5rem",
      },
      {
        name: "Type",
        render: transactionType,
        width: "12ch",
      },
      {
        name: "Customer",
        render: transactionName,
        width: "20ch",
      },
      {
        name: "Bike",
        render: transactionBike,
        width: "auto",
      },
      {
        name: "Created",
        render: transactionCreated,
        width: "auto",
      },
    ]}
  />
{/await}
