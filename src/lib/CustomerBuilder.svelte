<script lang="ts">
  import { type NewCustomer } from "$lib/api";

  interface Props {
    callback: (customer: NewCustomer) => void;
  }

  let { callback } = $props();

  let firstName = $state("");
  let lastName = $state("");
  let email = $state("");
  let phone: string | null = $state("");
  let customer = $derived({
    firstName,
    lastName,
    email,
    phone: phone.trim() === "" ? null : phone,
  });
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    callback(customer);
  }}
>
  <input
    required
    bind:value={firstName}
    placeholder="First name"
    style="display: block"
  />
  <input
    required
    bind:value={lastName}
    placeholder="Last name"
    style="display: block"
  />
  <input
    required
    bind:value={email}
    placeholder="Email"
    type="email"
    style="display: block"
  />
  <input
    bind:value={phone}
    placeholder="Phone"
    type="phone"
    style="display: block"
  />
  <button>Create</button>
</form>
