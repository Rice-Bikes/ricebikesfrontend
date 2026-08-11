<script lang="ts">
  import { rbFetch, stepFromRaw, rawFromStep, type Step } from "$lib/api";
  import Check from "$lib/icons/Check.svelte";
  import Trash from "$lib/icons/Trash.svelte";
  import ArrowRight from "$lib/icons/ArrowRight.svelte";

  interface Props {
    steps?: Step[];
    transaction?: string;
    bundle?: string;
  }

  // `steps` bindable but parent should not modify it for now. Could add upport for measuring
  // change and sending data to the server accordingly, but doesn't seem necessary right now.
  // This would be the "idiomatic" Svelte approach but honestly I don't think the app has any
  // reason for that functionality.
  let {
    steps = $bindable([]),
    transaction = undefined,
    bundle = undefined,
  }: Props = $props();

  const STEP_ORDER_SIZE = 1000;
  const maxStepOrder = $derived(
    steps.length > 0
      ? steps.reduce((a, b) => (a.order > b.order ? a : b), steps[0]).order
      : 0,
  );

  $effect(() => {
    loadSteps();
  });
  async function loadSteps() {
    const urlParamsObj: Record<string, string> = {};
    if (transaction !== undefined) {
      urlParamsObj["transaction_id"] = transaction;
    }
    if (bundle !== undefined) {
      urlParamsObj["bundle_id"] = bundle;
    }
    const urlParams = new URLSearchParams(urlParamsObj);
    const rawSteps: any[] = await rbFetch(`/steps?${urlParams}`);
    steps = rawSteps.map(stepFromRaw);
  }

  let newStep = $state("");
  async function submitNewStep() {
    const trimmed = newStep.trim();
    if (trimmed.length === 0) {
      newStep = "";
      return;
    }
    const stepData = {
      description: trimmed,
      transactionId: transaction,
      bundleId: bundle,
      order: maxStepOrder + STEP_ORDER_SIZE,
    };
    newStep = "";
    const newIdx = steps.length;
    steps.push({
      id: `TEMP-${newIdx}`,
      completed: false,
      ...stepData,
    });
    const rawStep = await rbFetch("/steps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromStep(stepData)),
    });
    steps[newIdx] = stepFromRaw(rawStep);
  }
  async function toggleStepCompleted(step: Step, i: number) {
    steps[i].completed = !steps[i].completed;
    await rbFetch(`/steps/${steps[i].id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completed: steps[i].completed,
      }),
    });
  }
  async function deleteStep(step: Step, i: number) {
    steps.splice(i, 1);
    await rbFetch(`/steps/${step.id}`, { method: "DELETE" });
  }
</script>

<div style="display: flex; flex-direction: column; gap: var(--space-2)">
  {#if steps.length > 0}
    <ul class="entry-list">
      {#each steps as step, i (step.id)}
        <li
          style="max-width: 50ch"
          class="entry-row"
          class:completed={step.completed}
        >
          <span class="entry-label">{step.description}</span>
          <span class="entry-actions">
            <button
              class="icon-btn success"
              class:active={step.completed}
              aria-label={step.completed
                ? "Mark step incomplete"
                : "Mark step complete"}
              onclick={() => toggleStepCompleted(step, i)}><Check /></button
            >
            <button
              class="icon-btn danger"
              aria-label="Delete step"
              onclick={() => deleteStep(step, i)}><Trash /></button
            >
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No steps</p>
  {/if}
  <form
    class="field-row"
    style="max-width: 50ch"
    onsubmit={(e) => {
      e.preventDefault();
      submitNewStep();
    }}
  >
    <input style="flex: 1" placeholder="Enter new step" bind:value={newStep} />
    <button class="icon-btn primary" aria-label="Submit step"
      ><ArrowRight /></button
    >
  </form>
</div>
