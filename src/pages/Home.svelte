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
  import Table from "$lib/Table.svelte";
  import TransactionBuilder from "$lib/TransactionBuilder.svelte";
  import beerSymbol from "../assets/beer.svg";
  import nuclearSymbol from "../assets/nuclear.svg";
  import employeeSymbol from "../assets/person.svg";
  import urgentSymbol from "../assets/exclamation.svg";
  import emailSymbol from "../assets/email.svg";
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
  <span>{transaction.transactionType}</span>
{/snippet}
{#snippet transactionCreated(transaction: Transaction)}
  <date>{transaction.dateCreated.toDateString()}</date>
{/snippet}
{#snippet transactionBike(transaction: Transaction)}
  <span>{transaction.bike?.make} {transaction.bike?.model}</span>
{/snippet}
{#snippet transactionTagsColumn(transaction: Transaction)}
  {#if transaction.isUrgent}
    <img src={urgentSymbol} alt="Urgent symbol" width="22" height="22" />
  {/if}
  {#if transaction.isBeerBike}
    <img src={beerSymbol} alt="Beer symbol" width="22" height="22" />
  {/if}
  {#if transaction.isEmployee}
    <img src={employeeSymbol} alt="Employee symbol" width="22" height="22" />
  {/if}
  {#if transaction.isNuclear}
    <img src={nuclearSymbol} alt="Nuclear symbol" width="22" height="22" />
  {/if}
  {#if transaction.isWaitingOnEmail}
    <img src={emailSymbol} alt="Email symbol" width="22" height="22" />
  {/if}
{/snippet}

<h1>Transactions</h1>

{#await filteredTransactions}
  <p>Loading...</p>
{:then transactions: Transaction[]}
  <select bind:value={view}>
    <option value="main">Main</option>
    <option value="builds">Builds</option>
    <option value="beerBikes">Beer bikes</option>
  </select>
  <button
    onclick={() => transactionBuilderKey++}
    command="show-modal"
    commandfor="transaction-dialog">New</button
  >
  <dialog id="transaction-dialog">
    {#key transactionBuilderKey}
      <TransactionBuilder
        customers={allCustomers}
        tuneups={tuneUps}
        {bundles}
        callback={onTransactionBuilt}
      />
    {/key}
    <button commandfor="transaction-dialog" command="close">Close</button>
  </dialog>
  <p>{transactions.length} transactions</p>
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
      },
      {
        name: "Tags",
        render: transactionTagsColumn,
      },
      {
        name: "Type",
        render: transactionType,
      },
      {
        name: "Customer",
        render: transactionName,
      },
      {
        name: "Bike",
        render: transactionBike,
      },
      {
        name: "Created",
        render: transactionCreated,
      },
    ]}
  />
{/await}
