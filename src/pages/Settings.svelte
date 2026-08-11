<script lang="ts">
  import {
    rbFetch,
    stepBundleFromRaw,
    tuneUpFromRaw,
    repairFromRaw,
    userFromRaw,
    rawFromStepBundle,
    rawFromTuneUp,
    rawFromUser,
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
  import EmployeeBuilder from "$lib/EmployeeBuilder.svelte";
  import Table from "$lib/Table.svelte";
  import Trash from "$lib/icons/Trash.svelte";
  import ArrowRight from "$lib/icons/ArrowRight.svelte";
  import Plus from "$lib/icons/Plus.svelte";
  import X from "$lib/icons/X.svelte";

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

  let employees = $state<User[]>([]);
  $effect(() => {
    loadEmployees();
  });
  async function loadEmployees() {
    const rawEmployees: any[] = await rbFetch("/users");
    employees = rawEmployees.map(userFromRaw);
  }

  let employeeBuilderKey = $state(0);
  async function onEmployeeBuilt(employee: NewUser) {
    const dialog = document.getElementById(
      "employee-dialog",
    ) as HTMLDialogElement;
    dialog.close();
    const rawUser = await rbFetch("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rawFromUser(employee)),
    });
    employees.push(userFromRaw(rawUser));
  }

  async function setActive(employee: User, active: boolean) {
    await rbFetch(`/users/${employee.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        active,
      }),
    });
  }
</script>

<h1>Settings</h1>
<section>
  <h2>Step Bundles</h2>
  <ul class="entry-list">
    {#each stepBundles as stepBundle, i (stepBundle.id)}
      <li>
        <details>
          <summary class="horizontal-align"
            ><span>{stepBundle.name}</span>
            <button
              class="icon-btn danger"
              aria-label="Delete step bundle"
              onclick={() => deleteStepBundle(stepBundle, i)}><Trash /></button
            >
          </summary>
          <StepList bundle={stepBundle.id} />
        </details>
      </li>
    {/each}
  </ul>
  <form
    class="field-row"
    style="margin-top: var(--space-4)"
    onsubmit={(e) => {
      e.preventDefault();
      submitNewStepBundle();
    }}
  >
    <input placeholder="Enter new step bundle" bind:value={newStepBundle} />
    <button class="icon-btn primary" aria-label="Submit step bundle"
      ><ArrowRight /></button
    >
  </form>
</section>
<section>
  <h2>Tune Ups</h2>
  <ul class="entry-list">
    {#each tuneUps as tuneUp, i (tuneUp.id)}
      {#snippet renderTuneUpCost()}
        ${tuneUp.cost}
      {/snippet}
      <li>
        <details>
          <summary class="horizontal-align"
            ><span>{tuneUp.name}</span>
            <button
              class="icon-btn danger"
              aria-label="Delete tune up"
              onclick={() => deleteTuneUp(tuneUp, i)}><Trash /></button
            >
          </summary>
          <TuneUpList {repairs} tuneup={tuneUp} />
          <div class="field-row">
            <span>Price:</span>
            <EditInput
              callback={(newCost) =>
                updateTuneUpCost(tuneUp, parseInt(newCost))}
              initial={tuneUp.cost.toString()}
              preedit={renderTuneUpCost}
              type="number"
            />
          </div>
        </details>
      </li>
    {/each}
  </ul>
  <form
    class="field-row wrap"
    style="margin-top: var(--space-4)"
    onsubmit={(e) => {
      e.preventDefault();
      submitNewTuneUp();
    }}
  >
    <input required placeholder="Enter new tune up" bind:value={newTuneUp} />
    <input
      required
      type="number"
      placeholder="Enter cost"
      bind:value={newTuneUpCost}
    />
    <button class="icon-btn primary" aria-label="Submit tune up"
      ><ArrowRight /></button
    >
  </form>
</section>
<section>
  {#snippet employeeNetID(employee: User)}
    {employee.netID}
  {/snippet}
  {#snippet employeeName(employee: User)}
    {employee.firstName} {employee.lastName}
  {/snippet}
  {#snippet employeeActive(employee: User)}
    <input
      type="checkbox"
      id={`${employee.id}-active`}
      onchange={(event) => setActive(employee, event.currentTarget.checked)}
      bind:checked={employee.active}
    />
  {/snippet}
  <h2>Employees</h2>
  <button
    class="primary"
    onclick={() => employeeBuilderKey++}
    style="margin-bottom: var(--space-4)"
    command="show-modal"
    commandfor="employee-dialog"><Plus /> New</button
  >
  <dialog id="employee-dialog" style="height: 25rem">
    <div style="display: flex; flex-direction: column; height: 100%">
      <div class="dialog-header">
        <h2>New Employee</h2>
        <button
          class="icon-btn dialog-close"
          command="close"
          commandfor="employee-dialog"
          aria-label="Close"><X /></button
        >
      </div>
      <div style="flex: 1">
        {#key employeeBuilderKey}
          <EmployeeBuilder {employees} callback={onEmployeeBuilt} />
        {/key}
      </div>
    </div>
  </dialog>
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
      { name: "netID", render: employeeNetID, width: "8rem" },
      { name: "Name", render: employeeName, width: "auto" },
      { name: "Active", render: employeeActive, width: "auto" },
    ]}
  />
</section>
