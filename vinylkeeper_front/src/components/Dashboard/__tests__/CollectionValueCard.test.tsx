import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CollectionValueCard from "@components/Dashboard/CollectionValueCard";
import { formatMoney as format } from "@components/Dashboard/collectionValueLabels";
import type { Currency } from "@models/IDashboardStats";

// As Testing Library reads the text: the narrow no-break spaces of some locales become spaces
const formatMoney = (amount: number, currency: Currency) => format(amount, currency).replace(/\s+/g, " ");
import type { CollectionValue } from "@models/IDashboardStats";

const api = vi.hoisted(() => ({ getValue: vi.fn(), refreshValue: vi.fn() }));
vi.mock("@services/DashboardApiService", () => ({ dashboardApiService: api }));

const value: CollectionValue = {
  collection_id: 7,
  collections: [
    { id: 7, name: "Jazz shelf" },
    { id: 8, name: "Sundays" },
  ],
  currency: "EUR",
  amounts: [
    { currency: "EUR", low: 1840, average: 2960, high: 4720 },
    { currency: "USD", low: 2048, average: 3294, high: 5253 },
  ],
  usd_rate: 1.113,
  rate_date: "2026-10-29",
  records_total: 830,
  records_priced: 812,
  pressings_to_confirm: 18,
  estimated_at: "2026-10-30T07:55:43Z",
  refresh_pending: 0,
  refreshable: 40,
  refreshes_left: 2,
  next_refresh_at: null,
};

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CollectionValueCard />
    </QueryClientProvider>
  );

beforeEach(() => {
  api.getValue.mockResolvedValue(value);
  api.refreshValue.mockResolvedValue({ requested: 40, pending: 40, estimated_seconds: 80 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CollectionValueCard", () => {
  it("shows low, average and high of the largest collection, with what the estimate rests on", async () => {
    renderCard();

    // Formatted in the reader's locale: "€1,840", "1 840 €"...
    expect(await screen.findByText(formatMoney(1840, "EUR"))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(2960, "EUR"))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(4720, "EUR"))).toBeInTheDocument();
    expect(screen.getByText(/Estimated on 812 of 830 records\. Last estimate on/)).toBeInTheDocument();
    expect(screen.getByText(/closer the estimate\. 18 pressings are not confirmed yet\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discogs" })).toHaveAttribute("href", "https://www.discogs.com");
    expect(api.getValue).toHaveBeenCalledWith("largest");
  });

  it("values every collection or another one", async () => {
    renderCard();

    await userEvent.click(await screen.findByRole("combobox", { name: "Collection" }));
    await userEvent.click(screen.getByRole("option", { name: "All my collections" }));

    await waitFor(() => expect(api.getValue).toHaveBeenLastCalledWith("all"));
  });

  it("re-evaluates every collection whatever the one shown, then the button waits", async () => {
    renderCard();

    const button = await screen.findByRole("button", { name: "Re-evaluate" });
    expect(screen.getByText(/Updates every collection you own, once a day\./)).toBeInTheDocument();
    await userEvent.click(button);

    expect(api.refreshValue).toHaveBeenCalledWith();
    expect(button).toBeDisabled();
  });

  it("shows the progress while prices are asked again", async () => {
    api.getValue.mockResolvedValue({ ...value, refresh_pending: 12 });
    renderCard();

    expect(await screen.findByRole("button", { name: "Re-evaluating, 12 left" })).toBeDisabled();
  });

  it("says when the next re-evaluation is possible once both are used", async () => {
    api.getValue.mockResolvedValue({ ...value, refreshes_left: 0, next_refresh_at: "2026-10-31T08:00:00Z" });
    renderCard();

    expect(await screen.findByRole("button", { name: "Re-evaluate" })).toBeDisabled();
    expect(screen.getByText(/One re-evaluation a day\. Next one possible on/)).toBeInTheDocument();
  });

  it("does not offer a re-evaluation when every price is fresh", async () => {
    api.getValue.mockResolvedValue({ ...value, refreshable: 0 });
    renderCard();

    expect(await screen.findByRole("button", { name: "Up to date" })).toBeDisabled();
  });

  it("shows the refusal of the server", async () => {
    api.refreshValue.mockRejectedValue({ code: 4290, message: "2 re-evaluations a day", details: {} });
    renderCard();

    await userEvent.click(await screen.findByRole("button", { name: "Re-evaluate" }));

    expect(await screen.findByText("2 re-evaluations a day")).toBeInTheDocument();
  });

  it("switches between euros and dollars without asking the server again", async () => {
    renderCard();
    await screen.findByText(formatMoney(1840, "EUR"));

    await userEvent.click(screen.getByRole("button", { name: "USD" }));

    expect(screen.getByText(formatMoney(2048, "USD"))).toBeInTheDocument();
    expect(screen.getByText(/Converted from euros at the ECB rate of 2026-10-29 \(1 EUR = 1\.113 USD\)\./))
      .toBeInTheDocument();
    expect(api.getValue).toHaveBeenCalledTimes(1);
  });

  it("opens in the currency picked in Settings", async () => {
    api.getValue.mockResolvedValue({ ...value, currency: "USD" });
    renderCard();

    expect(await screen.findByText(formatMoney(3294, "USD"))).toBeInTheDocument();
  });

  it("shows euros only while no dollar rate is known", async () => {
    api.getValue.mockResolvedValue({ ...value, amounts: [value.amounts[0]], usd_rate: null, rate_date: null });
    renderCard();

    await screen.findByText(formatMoney(1840, "EUR"));
    expect(screen.queryByRole("button", { name: "USD" })).not.toBeInTheDocument();
  });

  it("invites to add records to an empty collection", async () => {
    api.getValue.mockResolvedValue({ ...value, collections: [], collection_id: null, records_total: 0 });
    renderCard();

    expect(await screen.findByText(/No records here yet/)).toBeInTheDocument();
    expect(screen.queryByText(formatMoney(1840, "EUR"))).not.toBeInTheDocument();
  });
});
