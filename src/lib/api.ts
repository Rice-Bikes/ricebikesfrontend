const apiBase = "http://localhost:3000";

export interface Item {
  id: string;
  upc: string;
  name: string;
  description: string;
  brand: string | null;
  standardPrice: number;
  wholesaleCost: number;
}
export type NewItem = Omit<Item, "id">;

export interface Repair {
  id: string;
  name: string;
  description: string | null;
  price: number;
}
export type NewRepair = Omit<Repair, "id">;

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}
export type NewCustomer = Omit<Customer, "id">;

export interface Bike {
  id: string;
  make: string;
  model: string;
  description: string;
}
export type NewBike = Omit<Bike, "id">;

export type TransactionType =
  | "inpatient"
  | "outpatient"
  | "merch"
  | "retrospec";

export interface Transaction {
  id: string;
  num: number;
  description: string;
  dateCreated: Date;
  dateCompleted: Date | null;
  transactionType: TransactionType;
  isUrgent: boolean;
  isBeerBike: boolean;
  isEmployee: boolean;
  isNuclear: boolean;
  isWaitingOnEmail: boolean;
  isCompleted: boolean;
  isPaid: boolean;
  isRefurb: boolean;
  customer: Customer | null;
  bike: Bike | null;
}

export interface NewTransaction {
  transactionType: TransactionType;
  bike: NewBike | null;
  stepBundle: StepBundle | null;
  tuneUp: TuneUp | null;
  customer: (NewCustomer & { id?: string }) | null;
  quantity: number;
}

export interface User {
  id: string;
  netID: string;
  firstName: string;
  lastName: string;
  active: boolean;
}

export interface Step {
  id: string;
  transactionId?: string;
  bundleId?: string;
  description: string;
  completed: boolean;
  order: number;
}
export type NewStep = Omit<Step, "id" | "completed"> & { completed?: boolean };

export interface StepBundle {
  id: string;
  name: string;
}
export type NewStepBundle = Omit<StepBundle, "id">;

export interface TuneUp {
  id: string;
  name: string;
  cost: number;
}
export type NewTuneUp = Omit<TuneUp, "id">;

export interface TuneUpItem {
  id: string;
  repair: Repair;
  tuneUpId: string;
}

export interface NewTuneUpItem {
  repairId: string;
  tuneUpId: string;
}

export interface TransactionDetailItem {
  kind: "item";
  id: string;
  item: Item;
}

export interface TransactionDetailRepair {
  kind: "repair";
  id: string;
  completed: boolean;
  tuneUpId: string | null;
  repair: Repair;
}

export type TransactionDetail = TransactionDetailItem | TransactionDetailRepair;

export interface HistoryEntry {
  id: string;
  transactionNum: number;
  changedBy: User;
  description: string;
  changeType: string;
  date: Date;
}

export interface OrderRequest {
  id: string;
  createdBy: User;
  ordered: boolean;
  notes: string;
  dateCreated: Date;
  item: Item;
  transaction: Transaction;
  quantitiy: number;
}

export interface OrderRequest {
  id: string;
  createdBy: User;
  ordered: boolean;
  notes: string;
  dateCreated: Date;
  item: Item;
  transaction: Transaction;
  quantitiy: number;
}

export interface NewOrderRequest {
  createdBy: string;
  ordered: boolean;
  notes: string;
  itemId: string;
  transactionId: string;
  quantitiy: number;
}

export class RbError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly body: unknown,
  ) {
    super(`${status} ${message}`);
  }
}

export async function rbFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(apiBase + url, options);
  const json = await response.json();
  if (json.statusCode < 200 || json.statusCode >= 300) {
    throw new RbError(json.statusCode, json.message, json.responseObject);
  }
  return json.responseObject;
}

export function transactionFromRaw(raw: any): Transaction {
  return {
    id: raw.transaction_id,
    num: raw.transaction_num,
    transactionType: raw.transaction_type.toLowerCase(),
    description: raw.description,
    dateCreated: new Date(raw.date_created),
    dateCompleted: raw.date_completed ? new Date(raw.date_completed) : null,
    isUrgent: raw.is_urgent,
    isBeerBike: raw.is_beer_bike,
    isEmployee: raw.is_employee,
    isNuclear: raw.is_nuclear,
    isWaitingOnEmail: raw.is_waiting_on_email,
    isCompleted: raw.is_completed,
    isPaid: raw.is_paid,
    isRefurb: raw.is_refurb,
    customer: raw.Customer
      ? {
          id: raw.Customer.customer_id,
          firstName: raw.Customer.first_name,
          lastName: raw.Customer.last_name,
          email: raw.Customer.email,
          phone: raw.Customer.phone,
        }
      : null,
    bike: raw.Bike
      ? {
          id: raw.Bike.bike_id,
          make: raw.Bike.make,
          model: raw.Bike.model,
          description: raw.Bike.description,
        }
      : null,
  };
}

export function rawFromTransaction(transaction: Partial<Transaction>): any {
  const raw: any = {};
  if (transaction.id !== undefined) raw.transaction_id = transaction.id;
  if (transaction.num !== undefined) raw.transaction_num = transaction.num;
  if (transaction.transactionType !== undefined)
    raw.transactionType = transaction.transactionType;
  if (transaction.description !== undefined)
    raw.description = transaction.description;
  if (transaction.dateCreated !== undefined)
    raw.date_created = transaction.dateCreated?.toISOString();
  if (transaction.dateCompleted !== undefined)
    raw.date_completed = transaction.dateCompleted
      ? transaction.dateCompleted.toISOString()
      : null;
  if (transaction.isUrgent !== undefined) raw.is_urgent = transaction.isUrgent;
  if (transaction.isBeerBike !== undefined)
    raw.is_beer_bike = transaction.isBeerBike;
  if (transaction.isEmployee !== undefined)
    raw.is_employee = transaction.isEmployee;
  if (transaction.isNuclear !== undefined)
    raw.is_nuclear = transaction.isNuclear;
  if (transaction.isWaitingOnEmail !== undefined)
    raw.is_waiting_on_email = transaction.isWaitingOnEmail;
  if (transaction.isCompleted !== undefined)
    raw.is_completed = transaction.isCompleted;
  if (transaction.isPaid !== undefined) raw.is_paid = transaction.isPaid;
  if (transaction.isRefurb !== undefined) raw.is_refurb = transaction.isRefurb;
  if (transaction.customer !== undefined)
    raw.customer_id = transaction.customer?.id || null;
  if (transaction.bike !== undefined && transaction.bike !== null)
    raw.bike_id = transaction.bike.id;
  return raw;
}

export function customerFromRaw(raw: any): Customer {
  return {
    id: raw.customer_id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    email: raw.email,
    phone: raw.phone,
  };
}

export function rawFromCustomer(customer: Partial<Customer>): any {
  const raw: any = {};
  if (customer.id !== undefined) raw.customer_id = customer.id;
  if (customer.firstName !== undefined) raw.first_name = customer.firstName;
  if (customer.lastName !== undefined) raw.last_name = customer.lastName;
  if (customer.email !== undefined) raw.email = customer.email;
  if (customer.phone !== undefined) raw.phone = customer.phone;
  return raw;
}

export function bikeFromRaw(raw: any): Bike {
  return {
    id: raw.bike_id,
    make: raw.make,
    model: raw.model,
    description: raw.description,
  };
}

export function rawFromBike(bike: Partial<Bike>): any {
  const raw: any = {};
  if (bike.id !== undefined) raw.bike_id = bike.id;
  if (bike.make !== undefined) raw.make = bike.make;
  if (bike.model !== undefined) raw.model = bike.model;
  if (bike.description !== undefined) raw.description = bike.description;
  return raw;
}

export function repairFromRaw(raw: any): Repair {
  return {
    id: raw.repair_id,
    name: raw.name,
    description: raw.description,
    price: raw.price,
  };
}

export function rawFromRepair(repair: Partial<Repair>): any {
  const raw: any = {};
  if (repair.id !== undefined) raw.repair_id = repair.id;
  if (repair.name !== undefined) raw.name = repair.name;
  if (repair.description !== undefined) raw.description = repair.description;
  if (repair.price !== undefined) raw.price = repair.price;
  return raw;
}

export function itemFromRaw(raw: any): Item {
  return {
    id: raw.item_id,
    upc: raw.upc,
    name: raw.name,
    description: raw.description,
    brand: raw.brand,
    standardPrice: raw.standard_price,
    wholesaleCost: raw.wholesale_cost,
  };
}

export function rawFromItem(item: Partial<Item>): any {
  const raw: any = {};
  if (item.id !== undefined) raw.item_id = item.id;
  if (item.upc !== undefined) raw.upc = item.upc;
  if (item.name !== undefined) raw.name = item.name;
  if (item.description !== undefined) raw.description = item.description;
  if (item.brand !== undefined) raw.brand = item.brand;
  if (item.standardPrice !== undefined) raw.standard_price = item.standardPrice;
  if (item.wholesaleCost !== undefined) raw.wholesale_cost = item.wholesaleCost;
  return raw;
}

export function userFromRaw(raw: any): User {
  return {
    id: raw.user_id,
    netID: raw.username,
    firstName: raw.firstname,
    lastName: raw.lastname,
    active: raw.active,
  };
}

export function rawFromUser(user: Partial<User>): any {
  const raw: any = {};
  if (user.id !== undefined) raw.user_id = user.id;
  if (user.netID !== undefined) raw.net_id = user.netID;
  if (user.firstName !== undefined) raw.first_name = user.firstName;
  if (user.lastName !== undefined) raw.last_name = user.lastName;
  if (user.active !== undefined) raw.active = user.active;
  return raw;
}

export function stepFromRaw(raw: any): Step {
  return {
    id: raw.step_id,
    transactionId: raw.transaction_id ?? undefined,
    bundleId: raw.bundle_id ?? undefined,
    description: raw.description,
    completed: raw.completed,
    order: raw.step_order,
  };
}

export function rawFromStep(step: Partial<Step>): any {
  const raw: any = {};
  if (step.id !== undefined) raw.step_id = step.id;
  if (step.transactionId !== undefined) raw.transaction_id = step.transactionId;
  if (step.bundleId !== undefined) raw.bundle_id = step.bundleId;
  if (step.description !== undefined) raw.description = step.description;
  if (step.completed !== undefined) raw.completed = step.completed;
  if (step.order !== undefined) raw.step_order = step.order;
  return raw;
}

export function stepBundleFromRaw(raw: any): StepBundle {
  return {
    id: raw.bundle_id,
    name: raw.name,
  };
}

export function rawFromStepBundle(stepBundle: Partial<StepBundle>): any {
  const raw: any = {};
  if (stepBundle.id !== undefined) raw.bundle_id = stepBundle.id;
  if (stepBundle.name !== undefined) raw.name = stepBundle.name;
  return raw;
}

export function tuneUpFromRaw(raw: any): TuneUp {
  return {
    id: raw.tune_up_id,
    name: raw.name,
    cost: raw.cost,
  };
}

export function rawFromTuneUp(tuneUp: Partial<TuneUp>): any {
  const raw: any = {};
  if (tuneUp.id !== undefined) raw.tune_up_id = tuneUp.id;
  if (tuneUp.name !== undefined) raw.name = tuneUp.name;
  if (tuneUp.cost !== undefined) raw.cost = tuneUp.cost;
  return raw;
}

export function tuneUpItemFromRaw(raw: any): TuneUpItem {
  return {
    id: raw.tune_up_item_id,
    repair: repairFromRaw(raw.Repair),
    tuneUpId: raw.tune_up_id,
  };
}

export function rawFromTuneUpItem(tuneUpItem: Partial<TuneUpItem>): any {
  const raw: any = {};
  if (tuneUpItem.id !== undefined) raw.tune_up_item_id = tuneUpItem.id;
  if (tuneUpItem.tuneUpId !== undefined) raw.tune_up_id = tuneUpItem.tuneUpId;
  if (tuneUpItem.repair !== undefined) raw.repair_id = tuneUpItem.repair.id;
  return raw;
}

export function transactionDetailFromRaw(raw: any): TransactionDetail {
  if (raw.repair_id !== null && raw.repair_id !== undefined) {
    return {
      kind: "repair",
      id: raw.transaction_detail_id,
      completed: raw.completed,
      tuneUpId: raw.tune_up_id,
      repair: repairFromRaw(raw.Repair),
    };
  }
  return {
    kind: "item",
    id: raw.transaction_detail_id,
    item: itemFromRaw(raw.Item),
  };
}

export function rawFromTransactionDetail(
  detail: Partial<TransactionDetail>,
): any {
  const raw: any = {};
  if (detail.id !== undefined) raw.transaction_detail_id = detail.id;
  if (detail.kind === "item") {
    if (detail.item !== undefined) raw.Item = rawFromItem(detail.item);
  } else if (detail.kind === "repair") {
    if (detail.completed !== undefined) raw.completed = detail.completed;
    if (detail.tuneUpId !== undefined) raw.tune_up_id = detail.tuneUpId;
    if (detail.repair !== undefined) raw.Repair = rawFromRepair(detail.repair);
  }
  return raw;
}

export function historyEntryFromRaw(raw: any): HistoryEntry {
  return {
    id: raw.log_id,
    transactionNum: raw.transaction_num,
    changedBy: userFromRaw(raw.Users),
    description: raw.description,
    changeType: raw.change_type,
    date: new Date(raw.dateModified),
  };
}

export function rawFromHistoryEntry(entry: Partial<HistoryEntry>): any {
  const raw: any = {};
  if (entry.id !== undefined) raw.log_id = entry.id;
  if (entry.transactionNum !== undefined)
    raw.transaction_num = entry.transactionNum;
  if (entry.changedBy !== undefined) raw.changed_by = entry.changedBy.id;
  if (entry.description !== undefined) raw.description = entry.description;
  if (entry.changeType !== undefined) raw.change_type = entry.changeType;
  if (entry.date !== undefined) raw.date = entry.date.toISOString();
  return raw;
}

export function orderRequestFromRaw(raw: any): OrderRequest {
  return {
    id: raw.order_request_id,
    createdBy: userFromRaw(raw.User),
    ordered: raw.ordered,
    notes: raw.notes ?? "",
    dateCreated: new Date(raw.date_created),
    transaction: transactionFromRaw(raw.Transaction),
    item: itemFromRaw(raw.Item),
    quantity: raw.quantity,
  };
}

export function rawFromOrderRequest(orderRequest: Partial<OrderRequest>): any {
  const raw: any = {};
  if (orderRequest.id !== undefined) raw.order_request_id = orderRequest.id;
  if (orderRequest.createdBy !== undefined)
    raw.created_by = orderRequest.createdBy.id;
  if (orderRequest.ordered !== undefined) raw.ordered = orderRequest.ordered;
  if (orderRequest.notes !== undefined) raw.notes = orderRequest.notes;
  if (orderRequest.dateCreated !== undefined)
    raw.date_created = orderRequest.dateCreated.toISOString();
  if (orderRequest.transactionId !== undefined)
    raw.transaction_id = orderRequest.transactionId;
  if (orderRequest.quantity !== undefined) raw.quantity = orderRequest.quantity;
  if (orderRequest.item !== undefined) raw.item_id = orderRequest.item.id;
  return raw;
}
