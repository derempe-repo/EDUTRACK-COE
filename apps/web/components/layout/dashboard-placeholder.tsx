type DashboardPlaceholderProps = {
  heading: string;
  description: string;
};

export function DashboardPlaceholder({ heading, description }: DashboardPlaceholderProps) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold text-neutral-950">{heading}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
      </div>
    </section>
  );
}
