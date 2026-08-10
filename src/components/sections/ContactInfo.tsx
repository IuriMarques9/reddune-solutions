import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  EMAIL,
  LOCATION,
  PHONE,
  PHONE_RAW,
} from "@/lib/constants";
import { SocialIcons } from "@/components/chrome/SocialIcons";

/**
 * ContactInfo — sidebar shown next to the Contact form.
 *
 * Order: phone, email, socials, location, map.
 */
export function ContactInfo() {
  const t = useTranslations("HomePage.ContactSection.contactInfo");

  return (
    <aside
      className={cn(
        "flex flex-col gap-5",
        "rounded-card bg-sand-warm/70 backdrop-blur",
        "border border-dune-deep/10",
        "p-7 md:p-9",
      )}
    >
      <header>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember">
          {t("title")}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {/* Telefone */}
        <ContactRow
          label={t("phone")}
          value={PHONE}
          href={`tel:+${PHONE_RAW}`}
        />

        {/* Email */}
        <ContactRow
          label={t("email")}
          value={EMAIL}
          href={`mailto:${EMAIL}`}
        />

        {/* Redes sociais */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
            {t("socials")}
          </span>
          <SocialIcons />
        </div>

        {/* Localização */}
        <ContactRow
          label={t("address")}
          value={`${LOCATION.city} · ${LOCATION.region}`}
          href={`https://www.google.com/maps?q=${encodeURIComponent(
            `${LOCATION.city}, ${LOCATION.region}, ${LOCATION.country}`,
          )}`}
          external
        />

        {/* Horário — a mesma verdade que o JSON-LD LocalBusiness publica ao Google */}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
            {t("hoursLabel")}
          </span>
          <span className="font-display text-[17px] md:text-[18px] font-semibold text-ink">
            {t("hoursValue")}
          </span>
        </div>
      </div>

      {/* Mapa */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[20px]",
          "aspect-[4/3] mt-2",
        )}
        style={{
          background:
            "linear-gradient(160deg, #d6422a 0%, #5a0e0e 70%, #2a0805 100%)",
        }}
      >
        <iframe
          src={`https://www.google.com/maps?q=${encodeURIComponent(
            `${LOCATION.city}, ${LOCATION.region}, ${LOCATION.country}`,
          )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Localização — ${LOCATION.city}, ${LOCATION.region}`}
          className="absolute inset-0 h-full w-full"
          style={{
            border: 0,
            filter: "contrast(1.05) saturate(0.85) sepia(0.18)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,107,63,0.18) 0%, transparent 35%, transparent 60%, rgba(42,8,5,0.45) 100%)",
          }}
        />
        <div className="absolute inset-x-5 bottom-4 text-cream">
          <div className="font-serif italic text-[20px] leading-tight">
            {LOCATION.city}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] opacity-85">
            {LOCATION.lat.toFixed(4)}°N · {Math.abs(LOCATION.lng).toFixed(4)}°W
          </div>
        </div>
      </div>
    </aside>
  );
}

function ContactRow({
  label,
  value,
  href,
  external = false,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  const linkClass = cn(
    "font-display text-[17px] md:text-[18px] font-semibold text-ink",
    "transition-colors duration-300 hover:text-ember",
  );
  if (external) {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
          {label}
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {value}
        </a>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
        {label}
      </span>
      <Link href={href} className={linkClass}>
        {value}
      </Link>
    </div>
  );
}
