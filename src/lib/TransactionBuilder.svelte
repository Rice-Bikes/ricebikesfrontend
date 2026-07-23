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
  let customer = $state<NewCustomer | null>(null);
  let buildingCustomer = $state(false);
  let stepBundleId = $state<string>("");
  let tuneUpId = $state<string>("");
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
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    callback(transaction);
  }}
>
  <select bind:value={transactionType}>
    <option value="inpatient">Inpatient</option>
    <option value="outpatient">Outpatient</option>
    <option value="merch">Merch</option>
    <option value="retrospec">Retrospec</option>
  </select>
  {#if transactionType !== "retrospec"}
    <CustomerSelector bind:customer {customers} />
  {:else}
    <select bind:value={retrospecType}>
      <option value="none"></option>
      <option value="harperSO">Harper (Step-Over/SS)</option>
      <option value="harperPlus">Harper Plus (Step-Over/SS)</option>
      <option value="harperST">Harper (Step-Thru/SS)</option>
      <option value="beaumont">Beaumont Plus (Step-Thru/8S)</option>
      <option value="atlas">Atlas (Step-Over/21S)</option>
    </select>
  {/if}
  {#if bundles.length > 0}
    <select bind:value={stepBundleId}>
      <option value=""></option>
      {#each bundles as bundle}
        <option value={bundle.id}>{bundle.name}</option>
      {/each}
    </select>
  {/if}
  {#if tuneups.length > 0}
    <select bind:value={tuneUpId}>
      <option value=""></option>
      {#each tuneups as tuneUp}
        <option value={tuneUp.id}>{tuneUp.name}</option>
      {/each}
    </select>
  {/if}
  <button class="primary">Create</button>
</form>
