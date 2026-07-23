<script lang="ts">
  import {
    rbFetch,
    rawFromCustomer,
    customerFromRaw,
    type Customer,
    type NewCustomer,
    type NewTransaction,
    type NewBike,
    type TransactionType,
    type StepBundle,
    type TuneUp,
  } from "$lib/api";
  import Picker from "$lib/Picker.svelte";
  import CustomerSelector from "$lib/CustomerSelector.svelte";

  interface Props {
    callback: (transaction: NewTransaction) => void;
    customers: Customer[];
    bundles: StepBundle[];
    tuneups: TuneUp[];
  }

  const { callback, customers, bundles, tuneups }: Props = $props();

  let transactionType = $state<TransactionType>("inpatient");
  let retrospecType = $state("none");
  let quantity = $state(1);
  let customer = $state<NewCustomer | null>(null);
  let buildingCustomer = $state(false);
  let stepBundleId = $state<string>("");
  let tuneUpId = $state<string>("");
  let error = $state<string | null>(null);
  const transaction = $derived.by(() => {
    let bike: NewBike | null = null;
    if (transactionType === "retrospec") {
      switch (retrospecType) {
        case "none":
          bike = { make: "", model: "", description: "" };
          break;
        case "harperSO":
          bike = {
            make: "Retrospec",
            model: "Harper (Step-Over/SS)",
            description: "",
          };
          break;
        case "harperPlus":
          bike = {
            make: "Retrospec",
            model: "Harper Plus",
            description: "",
          };
          break;
        case "harperST":
          bike = {
            make: "Retrospec",
            model: "Harper (Step-Thru/SS)",
            description: "",
          };
          break;
        case "beaumont":
          bike = {
            make: "Retrospec",
            model: "Beaumont Plus (Step-Thru/8S)",
            description: "",
          };
          break;
        case "atlas":
          bike = {
            make: "Retrospec",
            model: "Atlas (Step-Over/21S)",
            description: "",
          };
          break;
      }
    } else if (transactionType !== "merch") {
      bike = { make: "", model: "", description: "" };
    }
    return {
      transactionType,
      customer: transactionType === "retrospec" ? null : customer,
      bike,
      stepBundle: bundles.find((b) => b.id === stepBundleId) ?? null,
      tuneUp: tuneups.find((t) => t.id == tuneUpId) ?? null,
      quantity: transactionType === "retrospec" ? parseInt(quantity) : 1,
    };
  });

  $effect(() => {
    if (transactionType === "retrospec") {
      stepBundleId =
        bundles.find((bundle) => bundle.name === "Default Retrospec")?.id ?? "";
      tuneUpId =
        tuneups.find((tuneUp) => tuneUp.name === "Default Retrospec")?.id ?? "";
    }
  });

  $effect(() => {
    if (
      transactionType === "retrospec" &&
      (quantity === null || quantity < 1 || !Number.isInteger(quantity))
    ) {
      error = "Please input a valid quantity";
      return;
    }
    error = null;
  });
</script>

<form
  style="display: flex; flex-direction: column; height: 100%"
  onsubmit={(e) => {
    e.preventDefault();
    if (error !== null) {
      return;
    }
    callback(transaction);
  }}
>
  <div>
    <label for="transaction-type-select">Transaction type:</label>
    <select id="transaction-type-select" bind:value={transactionType}>
      <option value="inpatient">Inpatient</option>
      <option value="outpatient">Outpatient</option>
      <option value="merch">Merch</option>
      <option value="retrospec">Retrospec</option>
    </select>
  </div>
  {#if transactionType !== "retrospec"}
    <div
      style="border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3)"
    >
      <CustomerSelector popover bind:customer {customers} />
    </div>
  {:else}
    <div>
      <label for="retrospec-select">Retrospec:</label>
      <select id="retrospec-select" bind:value={retrospecType}>
        <option value="none"></option>
        <option value="harperSO">Harper (Step-Over/SS)</option>
        <option value="harperPlus">Harper Plus (Step-Over/SS)</option>
        <option value="harperST">Harper (Step-Thru/SS)</option>
        <option value="beaumont">Beaumont Plus (Step-Thru/8S)</option>
        <option value="atlas">Atlas (Step-Over/21S)</option>
      </select>
    </div>
    <div>
      <label for="retrospec-quantity">Quantity:</label>
      <input bind:value={quantity} min="1" step="1" type="number" />
    </div>
  {/if}
  {#if bundles.length > 0}
    <div>
      <label for="step-bundle-select">Step bundle:</label>
      <select id="step-bundle-select" bind:value={stepBundleId}>
        <option value=""></option>
        {#each bundles as bundle}
          <option value={bundle.id}>{bundle.name}</option>
        {/each}
      </select>
    </div>
  {/if}
  {#if tuneups.length > 0}
    <div>
      <label for="tune-up-select">Tune up:</label>
      <select id="tune-up-select" bind:value={tuneUpId}>
        <option value=""></option>
        {#each tuneups as tuneUp}
          <option value={tuneUp.id}>{tuneUp.name}</option>
        {/each}
      </select>
    </div>
  {/if}
  {#if error !== null}
    <p style="color: var(--color-danger)">{error}</p>
  {/if}
  <div style="flex: 1; min-height: 0"></div>
  <button class="primary">Create</button>
</form>
