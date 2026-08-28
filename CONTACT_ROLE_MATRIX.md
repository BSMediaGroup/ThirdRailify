# Third Railify contact-role matrix

Internal engineering evidence as at 28 August 2026. An address in source proves configuration or publication only; it does not prove that a mailbox is provisioned, monitored, or covered outside business hours.

| Address | Intended purpose | Where used | Application `FROM` | Application `REPLY-TO` | Display only | Monitoring proven |
| --- | --- | --- | --- | --- | --- | --- |
| `privacy@thirdrailify.com` | Privacy requests, complaints, access/correction and consent withdrawal | Privacy Policy | No | No | Yes | No |
| `support@thirdrailify.com` | General, product, order, refund, remedy and accessibility support | Terms, Privacy, Refund and Accessibility policies; policy UI | No | No | Yes | No |
| `access@thirdrailify.com` | Accessibility barriers and alternative-format requests | Privacy and Accessibility policies | No | No | Yes | No |
| `webmaster@thirdrailify.com` | Technical and security issues | Terms and Privacy policies | No | No | Yes | No |
| `info@thirdrailify.com` | General contact and current transactional reply route | Public footer and protected contact form; Admin commerce profile/default templates; GOATS support links | No | Yes, as the contact-form destination and through Admin `MAIL_REPLY_TO` for account and GOATS Resend messages | Yes | No |
| `alerts@notify.thirdrailify.com` | Transactional sender identity | Admin `MAIL_FROM` | Yes, for account and GOATS Resend messages | No | No | No; sender-domain configuration does not prove inbox monitoring |

The Public contact form relays through the Admin authority and Resend to `info@thirdrailify.com`, with the configured Gmail address copied; the visitor's validated email becomes Reply-To. No application code establishes mailbox staffing, response time, or monitoring. Historical migration CSV content is not runtime policy authority.

Owner decision: **Confirm which of the currently published Third Railify contact addresses are actively monitored and which should remain customer-facing.** Until confirmed, no alias should be removed or replaced solely on engineering inference.
