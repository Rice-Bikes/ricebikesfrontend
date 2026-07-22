<script lang="ts">
  const { callback } = $props();

  let name = $state("");
  let description = $state("");
  let price = $state("");
  let repair = $derived({
    name,
    description,
    price: Number(price),
  });
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    callback(repair);
  }}
>
  <input required bind:value={name} placeholder="Name" style="display: block" />
  <input
    required
    type="number"
    step="any"
    min="0"
    bind:value={price}
    placeholder="Price"
    style="display: block"
  />
  <input
    bind:value={description}
    placeholder="Description"
    style="display: block"
  />
  <button>Save</button>
</form>
