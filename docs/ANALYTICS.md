# Website analytics

The site uses PostHog for pageviews, automatic interactions, blog CTA clicks and newsletter
signups. App Store badges also send an explicit `app_store_click` event.

## App Store click event

| Property | Meaning |
| --- | --- |
| `product` | `first100-web` |
| `app_name` | World Languages or Somali app name |
| `placement` | Existing CTA label: `hero`, `footer` or `language-<slug>` |
| `language` | Language slug on a language page; null on the homepage |
| `language_code` | Language code on a language page; null on the homepage |
| `page_path` | Page pathname, without query parameters |
| `app_store_url` | App Store destination |

Normal clicks, keyboard activation and middle clicks are tracked. Native links continue
to work if PostHog is unavailable. The handler is installed once per page, including pages
with multiple badges.

A click records an outbound visit, not an installation or purchase. Use App Store Connect
for downloads and RevenueCat for purchases. Default PostHog page properties retain referral
and campaign context.

## Verification

Use a campaign such as `utm_source=qa&utm_medium=verification&utm_campaign=first100-analytics-<date>`
for browser checks. Query PostHog for that exact campaign URL and event name. Confirm one
event per activation and check language, placement and destination. Exclude QA campaigns
from growth reports.

## Search Console

Prefer a Domain property for `first100.org`, covering both apex and www. It requires a
Google-issued DNS verification record and access to the domain's DNS provider. A URL-prefix
property for `https://www.first100.org/` can instead use a deployed HTML file or meta tag.

Submit `https://www.first100.org/sitemap-index.xml` after verification. Keep the verification
record or file in place. Google Analytics is not required.

References: [ownership verification](https://support.google.com/webmasters/answer/9008080),
[PostHog events](https://posthog.com/docs/product-analytics/capture-events).
