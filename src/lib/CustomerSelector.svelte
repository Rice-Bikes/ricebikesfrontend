<script lang="ts">
  import {
    rbFetch,
    customerFromRaw,
    rawFromCustomer,
    type Customer,
    type NewCustomer,
  } from "$lib/api";
  import CustomerBuilder from "$lib/CustomerBuilder.svelte";
  import Picker from "$lib/Picker.svelte";
  import Plus from "$lib/icons/Plus.svelte";
  import X from "$lib/icons/X.svelte";

  interface Props {
    customer?: Customer | null;
    customers: Customer[];
    popover?: boolean;
  }

  type NameCustomer = Customer & { name: string };

  let { customer = $bindable(null), customers, popover = false } = $props();

  let customerBuilderKey = $state(0);

  function onCustomerPicked(c: NameCustomer) {
    customer = c;
  }

  async function onCustomerBuilt(c: NewCustomer) {
    const dialog = document.getElementById(
      "customer-builder-dialog",
    ) as HTMLDialogElement;
    dialog.close();
    const rawCustomer = await rbFetch("/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromCustomer(c)),
    });
    customer = customerFromRaw(rawCustomer);
    customer.name = `${customer.firstName} ${customer.lastName}`;
    customers.push(customer);
  }
</script>

{#snippet customerRender(customer: NameCustomer)}
  {customer.name} ({customer.email})
{/snippet}

<div class="field-row" style="margin-bottom: var(--space-2)">
  <span>Customer:</span>
  {#if customer !== null}
    {@render customerRender(customer)}
  {:else}
    <span class="muted">None</span>
  {/if}
  <button
    class="primary"
    commandfor="customer-builder-dialog"
    command="show-modal"
    onclick={() => customerBuilderKey++}
    type="button"
  >
    <Plus />New</button
  >
</div>
<Picker
  data={customers.map((x: Customer) => {
    return { name: `${x.firstName} ${x.lastName}`, ...x };
  })}
  {popover}
  key={(customer) => customer.id}
  searchKeys={["name", "email"]}
  render={customerRender}
  callback={onCustomerPicked}
  placeholder="Find existing customer"
/>
<dialog id="customer-builder-dialog">
  <div class="dialog-header">
    <h2>New customer</h2>
    <button
      class="icon-btn dialog-close"
      command="close"
      commandfor="customer-builder-dialog"
      aria-label="Close"
      type="button"><X /></button
    >
  </div>
  {#key customerBuilderKey}
    <CustomerBuilder callback={onCustomerBuilt} />
  {/key}
</dialog>
