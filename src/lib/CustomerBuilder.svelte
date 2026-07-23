<script lang="ts">
  import { type NewCustomer } from "$lib/api";
  import { formatPhoneNumber } from "$lib/format";

  interface Props {
    callback: (customer: NewCustomer) => void;
  }

  let { callback } = $props();

  let firstName = $state("");
  let lastName = $state("");
  let email = $state("");
  let phone: string = $state("");
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
  <input required bind:value={firstName} placeholder="First name" />
  <input required bind:value={lastName} placeholder="Last name" />
  <input required bind:value={email} placeholder="Email" type="email" />
  <input
    value={phone}
    oninput={(e) => (phone = formatPhoneNumber(e.currentTarget.value))}
    placeholder="Phone"
    type="tel"
  />
  <button class="primary">Create</button>
</form>
