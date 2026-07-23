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

  interface Props {
    customer?: Customer | null;
    customers: Customer[];
  }

  type NameCustomer = Customer & { name: string };

  let { customer = $bindable(null), customers } = $props();

  let buildingCustomer = $state(false);

  function onCustomerPicked(c: NameCustomer) {
    customer = c;
  }

  async function onCustomerBuilt(c: NewCustomer) {
    const rawCustomer = await rbFetch("/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromCustomer(c)),
    });
    customer = customerFromRaw(rawCustomer);
    buildingCustomer = false;
    customers.push(customer);
  }
</script>

{#snippet customerRender(customer: NameCustomer)}
  {customer.name} ({customer.email})
{/snippet}

<p class="field-row">
  <span>Customer:</span>
  {#if customer !== null}
    {@render customerRender(customer)}
  {:else}
    <span class="muted">None</span>
  {/if}
</p>
<button onclick={() => (buildingCustomer = !buildingCustomer)} type="button">
  {#if buildingCustomer}
    Close
  {:else}
    New customer
  {/if}
</button>
<Picker
  data={customers.map((x: Customer) => {
    return { name: `${x.firstName} ${x.lastName}`, ...x };
  })}
  popover
  key={(customer) => customer.id}
  searchKeys={["name", "email"]}
  render={customerRender}
  callback={onCustomerPicked}
  placeholder="Find existing customer"
/>
{#if buildingCustomer}
  <CustomerBuilder callback={onCustomerBuilt} />
{/if}
