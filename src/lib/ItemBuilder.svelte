<script lang="ts">
  import { type NewItem } from "$lib/api";

  interface Props {
    callback: (item: NewItem) => void;
  }

  const { callback }: Props = $props();

  let name = $state("");
  let brand = $state("");
  let upc = $state("");
  let standardPrice = $state("");
  let wholesaleCost = $state("");
  let description = $state("");
  let item = $derived({
    upc,
    name,
    description,
    brand: brand.trim() === "" ? null : brand,
    standardPrice: Number(standardPrice),
    wholesaleCost: Number(wholesaleCost),
  });

  function generateUPC() {
    upc = Math.floor(Math.random() * 1000000000000).toString();
  }
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    callback(item);
  }}
>
  <input required bind:value={name} placeholder="Name" style="display: block" />
  <input bind:value={brand} placeholder="Brand" style="display: block" />
  <div>
    <input required bind:value={upc} placeholder="UPC" />
    <button type="button" onclick={generateUPC}>Generate UPC</button>
  </div>
  <input
    required
    type="number"
    step="any"
    min="0"
    bind:value={standardPrice}
    placeholder="Standard price"
    style="display: block"
  />
  <input
    required
    type="number"
    step="any"
    min="0"
    bind:value={wholesaleCost}
    placeholder="Wholesale cost"
    style="display: block"
  />
  <input
    required
    bind:value={description}
    placeholder="Description"
    style="display: block"
  />
  <button>Save</button>
</form>
