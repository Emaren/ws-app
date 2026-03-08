import type { ReviewProfileDraft } from "@/lib/reviewProfile";

type ReviewProfileFieldKey = keyof ReviewProfileDraft;

type Props = {
  value: ReviewProfileDraft;
  onChange: (field: ReviewProfileFieldKey, nextValue: string) => void;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  type?: "text" | "url" | "number";
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        className="admin-surface rounded-xl px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        className="admin-surface min-h-[88px] rounded-xl px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function ReviewProfileFields({ value, onChange }: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/40 p-4 md:p-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Structured Review Profile</h3>
        <p className="text-sm opacity-75">
          This turns the article into reusable product data for search, comparisons, stores,
          offers, and rewards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Product Name"
          value={value.productName}
          onChange={(nextValue) => onChange("productName", nextValue)}
          placeholder="Avalon Organic Chocolate Milk"
        />
        <TextInput
          label="Brand"
          value={value.brandName}
          onChange={(nextValue) => onChange("brandName", nextValue)}
          placeholder="Avalon"
        />
        <TextInput
          label="Category"
          value={value.category}
          onChange={(nextValue) => onChange("category", nextValue)}
          placeholder="Organic dairy"
        />
        <TextInput
          label="Review Score"
          value={value.reviewScore}
          onChange={(nextValue) => onChange("reviewScore", nextValue)}
          placeholder="92"
          type="number"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextArea
          label="Verdict"
          value={value.verdict}
          onChange={(nextValue) => onChange("verdict", nextValue)}
          placeholder="A premium organic staple worth paying extra for."
        />
        <TextArea
          label="Organic Status"
          value={value.organicStatus}
          onChange={(nextValue) => onChange("organicStatus", nextValue)}
          placeholder="Certified organic, glass bottle, pasture-aligned sourcing"
        />
        <TextArea
          label="Best For"
          value={value.recommendedFor}
          onChange={(nextValue) => onChange("recommendedFor", nextValue)}
          placeholder="Families replacing sugary pantry mixes with real dairy"
        />
        <TextArea
          label="Skip If"
          value={value.avoidFor}
          onChange={(nextValue) => onChange("avoidFor", nextValue)}
          placeholder="Budget-first shoppers who need the cheapest calories"
        />
      </div>

      <TextArea
        label="Local Availability"
        value={value.localAvailability}
        onChange={(nextValue) => onChange("localAvailability", nextValue)}
        placeholder="Best purchased through specialty local grocers and delivery partners"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
          <div className="space-y-1">
            <h4 className="font-semibold">Conventional Comparison Card</h4>
            <p className="text-xs opacity-70">
              Usually the mainstream product you want readers to compare against.
            </p>
          </div>
          <TextInput
            label="Title"
            value={value.conventionalTitle}
            onChange={(nextValue) => onChange("conventionalTitle", nextValue)}
            placeholder="NESQUICK CHOCOLATE POWDER 44.9OZ"
          />
          <TextInput
            label="Link"
            value={value.conventionalHref}
            onChange={(nextValue) => onChange("conventionalHref", nextValue)}
            placeholder="https://www.amazon.ca/..."
          />
          <TextInput
            label="Image URL"
            value={value.conventionalImageSrc}
            onChange={(nextValue) => onChange("conventionalImageSrc", nextValue)}
            placeholder="/NQ.png"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Badge"
              value={value.conventionalBadge}
              onChange={(nextValue) => onChange("conventionalBadge", nextValue)}
              placeholder="Conventional pick"
            />
            <TextInput
              label="Price Hint"
              value={value.conventionalPriceHint}
              onChange={(nextValue) => onChange("conventionalPriceHint", nextValue)}
              placeholder="From $34.60"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
          <div className="space-y-1">
            <h4 className="font-semibold">Organic Comparison Card</h4>
            <p className="text-xs opacity-70">
              This is the organic or local-first product you want to elevate.
            </p>
          </div>
          <TextInput
            label="Title"
            value={value.organicTitle}
            onChange={(nextValue) => onChange("organicTitle", nextValue)}
            placeholder="Avalon Organic Chocolate Milk"
          />
          <TextInput
            label="Link"
            value={value.organicHref}
            onChange={(nextValue) => onChange("organicHref", nextValue)}
            placeholder="mailto:tony@wheatandstone.ca?subject=Order"
          />
          <TextInput
            label="Image URL"
            value={value.organicImageSrc}
            onChange={(nextValue) => onChange("organicImageSrc", nextValue)}
            placeholder="/AV.png"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Badge"
              value={value.organicBadge}
              onChange={(nextValue) => onChange("organicBadge", nextValue)}
              placeholder="Health pick"
            />
            <TextInput
              label="Price Hint"
              value={value.organicPriceHint}
              onChange={(nextValue) => onChange("organicPriceHint", nextValue)}
              placeholder="From $5.79"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
