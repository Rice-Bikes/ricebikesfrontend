import { type User } from "$lib/api";

export interface AppState {
  user: User | null;
}

export const appState = $state<AppState>({
  user: null,
});
