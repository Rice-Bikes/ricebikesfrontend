<script lang="ts">
  import { type NewUser } from "$lib/api";

  interface Props {
    callback: (employee: NewUser) => void;
  }

  let { callback } = $props();

  let netID = $state("");
  let firstName = $state("");
  let lastName = $state("");
  let employee = $derived({
    firstName,
    lastName,
    netID,
  });
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    callback(employee);
  }}
>
  <input required bind:value={netID} placeholder="NetID" />
  <input required bind:value={firstName} placeholder="First name" />
  <input required bind:value={lastName} placeholder="Last name" />
  <button class="primary">Create</button>
</form>
