/** Lightweight typed fetch helpers used by client components. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse(res: Response) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: <T = unknown>(url: string) => fetch(url).then(parse) as Promise<T>,
  post: <T = unknown>(url: string, body?: unknown) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(parse) as Promise<T>,
  patch: <T = unknown>(url: string, body: unknown) =>
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(parse) as Promise<T>,
  del: <T = unknown>(url: string) => fetch(url, { method: "DELETE" }).then(parse) as Promise<T>,
};

export type Transaction = {
  id: string;
  mandalId: string;
  festivalId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  paymentMode: "cash" | "upi";
  donorName: string | null;
  mobile: string | null;
  vendorName: string | null;
  note: string | null;
  billImageUrl: string | null;
  receiptNumber: string | null;
  date: string;
  createdAt: string;
  createdBy: string;
};

export type Mandal = {
  id: string;
  name: string;
  address: string;
  establishedYear: number;
  registrationNumber: string;
  phone: string;
  logoUrl: string | null;
  receiptHeader: string;
  receiptFooter: string;
  receiptPrefix: string;
  receiptNextNumber: number;
};

export type Festival = {
  id: string;
  mandalId: string;
  name: string;
  year: number;
  status: string;
  isActive: boolean;
};

export type MeResponse = {
  user: { id: string; email: string; name: string | null; role: string };
  mandal: Mandal | null;
  festivals: Festival[];
  activeFestival: Festival | null;
};

export type DashboardSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalTransactions: number;
  recent: Transaction[];
};
