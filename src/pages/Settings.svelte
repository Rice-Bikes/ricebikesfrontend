<script lang="ts">
  import {
    rbFetch,
    stepBundleFromRaw,
    tuneUpFromRaw,
    repairFromRaw,
    userFromRaw,
    rawFromStepBundle,
    rawFromTuneUp,
    type StepBundle,
    type NewStepBundle,
    type TuneUp,
    type NewTuneUp,
    type Repair,
    type User,
  } from "$lib/api";
  import EditInput from "$lib/EditInput.svelte";
  import StepList from "$lib/StepList.svelte";
  import TuneUpList from "$lib/TuneUpList.svelte";
  import Table from "$lib/Table.svelte";

  let stepBundles = $state<StepBundle[]>([]);
  $effect(() => {
    loadStepBundles();
  });
  async function loadStepBundles() {
    const rawStepBundles: any[] = await rbFetch("/stepBundles");
    stepBundles = rawStepBundles.map(stepBundleFromRaw);
  }

  let tuneUps = $state<TuneUp[]>([]);
  $effect(() => {
    loadTuneUps();
  });
  async function loadTuneUps() {
    const rawTuneUps: any[] = await rbFetch("/tuneUps");
    tuneUps = rawTuneUps.map(tuneUpFromRaw);
  }

  let newStepBundle = $state("");
  async function submitNewStepBundle() {
    const trimmed = newStepBundle.trim();
    if (trimmed.length === 0) {
      newStepBundle = "";
      return;
    }
    const bundle: NewStepBundle = { name: trimmed };
    newStepBundle = "";
    const stepBundle = await rbFetch("/stepBundles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromStepBundle(bundle)),
    });
    stepBundles.push(stepBundleFromRaw(stepBundle));
  }
  async function deleteStepBundle(bundle: StepBundle, i: number) {
    await rbFetch(`/stepBundles/${bundle.id}`, { method: "DELETE" });
    stepBundles.splice(i, 1);
  }

  let newTuneUp = $state("");
  let newTuneUpCost = $state("");
  async function submitNewTuneUp() {
    const trimmed = newTuneUp.trim();
    if (trimmed.length === 0) {
      newTuneUp = "";
      return;
    }
    const tuneUp: NewTuneUp = { name: trimmed, cost: parseInt(newTuneUpCost) };
    newTuneUpCost = "";
    newTuneUp = "";
    const raw = await rbFetch("/tuneUps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromTuneUp(tuneUp)),
    });
    tuneUps.push(tuneUpFromRaw(raw));
  }
  async function deleteTuneUp(tuneUp: TuneUp, i: number) {
    await rbFetch(`/tuneUps/${tuneUp.id}`, { method: "DELETE" });
    tuneUps.splice(i, 1);
  }
  async function updateTuneUpCost(tuneUp: TuneUp, cost: number) {
    if (cost === tuneUp.cost) {
      return;
    }
    tuneUp.cost = cost;
    await rbFetch(`/tuneUps/${tuneUp.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromTuneUp({ cost })),
    });
  }

  let repairs = $state<Repair[]>([]);
  $effect(() => {
    loadRepairs();
  });
  async function loadRepairs() {
    const rawRepairs: any[] = await rbFetch("/repairs");
    repairs = rawRepairs.map(repairFromRaw);
  }

  let employees = $state<User>([]);
  $effect(() => {
    loadEmployees();
  });
  async function loadEmployees() {
    const rawEmployees: any[] = await rbFetch("/users");
    employees = rawEmployees.map(userFromRaw);
  }
</script>

<h1>Settings</h1>
<section>
  <h2>Step Bundles</h2>
  <ol>
    {#each stepBundles as stepBundle, i (stepBundle.id)}
      <li>
        <details>
          <summary>{stepBundle.name}</summary>
          <StepList bundle={stepBundle.id} />
          <button onclick={() => deleteStepBundle(stepBundle, i)}>Delete</button
          >
        </details>
      </li>
    {/each}
  </ol>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      submitNewStepBundle();
    }}
  >
    <input placeholder="Enter new step bundle" bind:value={newStepBundle} />
    <button>Submit</button>
  </form>
</section>
<section>
  <h2>Tune Ups</h2>
  <ol>
    {#each tuneUps as tuneUp, i (tuneUp.id)}
      {#snippet renderTuneUpCost()}
        ${tuneUp.cost}
      {/snippet}
      <li>
        <details>
          <summary>{tuneUp.name}</summary>
          <TuneUpList {repairs} tuneup={tuneUp} />
          Price: <EditInput
            callback={(newCost) => updateTuneUpCost(tuneUp, parseInt(newCost))}
            initial={tuneUp.cost.toString()}
            preedit={renderTuneUpCost}
            type="number"
          />
          <button onclick={() => deleteTuneUp(tuneUp, i)}>Delete</button>
        </details>
      </li>
    {/each}
  </ol>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      submitNewTuneUp();
    }}
  >
    <input
      style="display: block"
      required
      placeholder="Enter new tune up"
      bind:value={newTuneUp}
    />
    <input
      style="display: block"
      required
      type="number"
      placeholder="Enter cost"
      bind:value={newTuneUpCost}
    />
    <button>Submit</button>
  </form>
</section>
<section>
  {#snippet employeeNetID(employee)}
    {employee.netID}
  {/snippet}
  {#snippet employeeName(employee)}
    {employee.firstName} {employee.lastName}
  {/snippet}
  {#snippet employeeActive(employee)}
    {#if employee.active}
      ACTIVE
    {:else}
      NOT ACTIVE
    {/if}
  {/snippet}
  <h2>Employees</h2>
  <Table
    data={employees}
    pageLimit={20}
    key={(employee) => employee.id}
    comparator={(a, b) => {
      if (a.active && !b.active) {
        return -1;
      }
      if (!a.active && b.active) {
        return 1;
      }
      return a.firstName.localeCompare(b.firstName);
    }}
    columns={[
      { name: "netID", render: employeeNetID },
      { name: "Name", render: employeeName },
      { name: "Status", render: employeeActive },
    ]}
  />
</section>
