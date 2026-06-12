type DonatePageProps = {
  searchParams?: Promise<{
    success?: string;
    canceled?: string;
    error?: string;
  }>;
};

const amountOptions = ["3", "5", "10", "25"];

const errorMessages: Record<string, string> = {
  amount: "Choose a donation amount between $1 and $500 CAD.",
  configuration: "Donations are not configured yet.",
  stripe: "Stripe checkout could not start. Please try again.",
};

function StatusMessage({
  success,
  canceled,
  error,
}: {
  success?: string;
  canceled?: string;
  error?: string;
}) {
  if (success === "1") {
    return (
      <p className="mb-6 border border-foreground/20 bg-foreground/5 px-4 py-3 text-small">
        Thank you for supporting Shredr.
      </p>
    );
  }

  if (canceled === "1") {
    return (
      <p className="mb-6 border border-foreground/20 bg-foreground/5 px-4 py-3 text-small">
        Checkout was canceled. No donation was made.
      </p>
    );
  }

  if (error) {
    return (
      <p className="mb-6 border border-foreground/20 bg-background px-4 py-3 text-small">
        {errorMessages[error] ?? "Something went wrong. Please try again."}
      </p>
    );
  }

  return null;
}

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center justify-center">
        <section className="grid w-full gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-display mb-4">Support Shredr</h1>
            <p className="text-lead mb-5">
              Help keep restaurant nutrition data fast, free, and easier to
              use.
            </p>
            <p className="text-lg">
              Donations help cover scraping, cache refreshes, AI menu
              estimates, and the small infrastructure costs behind every search.
            </p>
          </div>

          <form
            action="/api/donations/checkout"
            method="post"
            className="w-full border border-foreground/20 bg-background/70 p-5 shadow-xl sm:p-7"
          >
            <StatusMessage
              success={params.success}
              canceled={params.canceled}
              error={params.error}
            />

            <fieldset className="mb-7">
              <legend className="mb-3 text-small uppercase tracking-[0.12em] opacity-70">
                Frequency
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="group cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="frequency"
                    value="one-time"
                    defaultChecked
                  />
                  <span className="flex min-h-14 items-center justify-center border-2 border-foreground/20 px-4 text-center transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background group-hover:border-foreground/50">
                    One time
                  </span>
                </label>
                <label className="group cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="frequency"
                    value="monthly"
                  />
                  <span className="flex min-h-14 items-center justify-center border-2 border-foreground/20 px-4 text-center transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background group-hover:border-foreground/50">
                    Monthly
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset className="mb-7">
              <legend className="mb-3 text-small uppercase tracking-[0.12em] opacity-70">
                Amount
              </legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {amountOptions.map((amount) => (
                  <label key={amount} className="group cursor-pointer">
                    <input
                      className="peer sr-only"
                      type="radio"
                      name="amount"
                      value={amount}
                      defaultChecked={amount === "5"}
                    />
                    <span className="flex min-h-14 items-center justify-center border-2 border-foreground/20 px-3 text-center text-lg transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background group-hover:border-foreground/50">
                      ${amount}
                    </span>
                  </label>
                ))}
              </div>

              <label className="mt-3 block cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="amount"
                  value="custom"
                />
                <span className="grid min-h-14 grid-cols-[auto_1fr] items-center gap-3 border-2 border-foreground/20 px-4 transition-colors peer-checked:border-foreground peer-checked:bg-foreground/5">
                  <span>Other</span>
                  <input
                    type="number"
                    name="customAmount"
                    min="1"
                    max="500"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Amount in CAD"
                    className="min-w-0 bg-transparent text-right outline-none placeholder:text-foreground/45"
                  />
                </span>
              </label>
            </fieldset>

            <button
              type="submit"
              className="w-full border-2 border-foreground bg-foreground px-6 py-4 text-lg text-background shadow-sm transition-all duration-200 hover:bg-foreground/90 hover:shadow-md"
            >
              Continue to Stripe
            </button>

            <p className="mt-4 text-center text-small opacity-70">
              Monthly donations renew automatically until canceled.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
