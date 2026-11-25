# Ride RSVP

Riders can put their name down on the TCD Ride page and the Purple Ride page. The sign-up sits under the big ride card, before the rest of the page. It is the same block on both pages. Only the ride it belongs to changes.

This is not on the live site until this branch is merged. GitHub Pages publishes `main`.

## What a rider does

They type an email (required) and a name (optional), then press **Confirm I'm coming**.

- If it saves, the form is replaced with a short confirmation.
- If that email is already signed up for this ride, they see: "This email is already on the list for this ride." The same address with different capital letters counts as the same email.
- If the address looks wrong, or the save does not go through, they see a plain sentence. No error codes.

## What everyone else sees

**Who's coming** lists a first name and a last initial, plus how many people that is. Emails are not on that list. The organizer can see the full email in the Supabase table.

The list refreshes about every 20 seconds, and again right after a successful sign-up.

When nobody has signed up yet, or the list cannot be loaded, the page shows 11 example names (Sara K., Omar R., and the rest). Those names are not real riders. They are marked `EXAMPLE DATA` in `rsvp-widget.js`, and the page shows an **Example data** label. A green **Updating live** label means the live list was reached (it is just empty). **List offline** means the live list could not be loaded, so the examples are standing in.

## Where it is saved

Project: `https://gtrjgfpxveiaytxmzeso.supabase.co`

Table: `public.rsvps`

| What | Where it comes from |
| --- | --- |
| `ride_ref` | `data-ride-ref` on the page. TCD Ride is `tcd-ride`. Purple Ride is `purple-ride`. |
| `ride_date` | The day selected on the ride page (the chips under "Plan for"), when one is showing. |
| `email` | The form, stored in lower case. |
| `name` | The form, or empty. |
| `status` | `confirmed` |
| `confirmed` | true |

One email can sign up once for TCD Ride and once for Purple Ride. A second try on the same ride is refused by the database (unique on ride ref + email).

The public list is not a direct read of the table. The page calls `ride_attendees(ride_ref)`, which returns only the short name, the status, and the count. The visitor key in `js/supabase-config.js` is the publishable key. It is allowed to insert a row and to call that function. It is not allowed to read the table, so the page never asks the insert to return the new row.

The list is everyone for that ride, not one Tuesday or one Thursday on its own. The date is stored so you can see which occurrence they had on screen when they signed up. The same person cannot sign up again next week under the same email; they will see the "already on the list" message.

Rows whose `ride_ref` starts with `test-` are checks made while building this. They are not real riders. You can delete them in the Supabase table editor when you like.

## Preview

From the homepage, the Group rides block sits above the header. Each ride card opens its own page:

- The TCD card (Details, or a click on the card itself) opens `tcd-ride.html`.
- The Purple card opens `purple-ride.html`.
- Share stays on the card and does not open the page. A swipe moves to the next card and does not open it.

On the ride page, scroll just under the green or purple ride card. That is the RSVP.

To look at it before merge, open the branch files with a local web server (the page loads the map, fonts, and Supabase, so opening the file directly is a poor preview). Nothing here is linked from the live homepage until merge.

## Go live later

1. Read the pull request and merge it into `main` when you are happy with it. Pages will publish the two ride pages with the RSVP on them.
2. Do not change the Supabase table for this. It is already set up.
3. Do not put a service-role key, secret key, or database password in the site. The publishable key in `js/supabase-config.js` is the only key the pages need.
4. Real sign-ups use `tcd-ride` and `purple-ride`. Leave those refs as they are unless you want a new list.

## Add it to another ride page

1. Link `rsvp-widget.css` in the page head.
2. After `ride-page.js`, add a mount and the three scripts, the same way `tcd-ride.html` does.
3. Set `data-ride-ref` to a new slug that is not `tcd-ride` or `purple-ride`. That slug is the list. Same table, separate people.

To give each date its own list instead of one list for the whole ride, the `data-ride-ref` value itself has to be different per date. The database lists people by that value only. Do that only if you want separate lists.
